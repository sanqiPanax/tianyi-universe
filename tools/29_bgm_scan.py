#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
29_bgm_scan.py —— 找出《新三国》全剧里「关羽之歌」BGM 出现在哪一集、哪一秒、持续多久。

为什么不能用 whisper:关羽之歌是纯音乐,没有台词,转写索引抓不到。
为什么不用 chroma(色度特征):**实测判定不可用**。管弦乐配器的 chroma 向量本身就接近
    均匀分布,逐帧 L2 归一化后任意两段的余弦相似度都在 0.95 以上 —— 全片最差位置 0.947,
    真值位置 1.000,完全没有动态范围。阴性对照(拿无关音频当模板)在真值位置也得 0.9925。
正解 = **地标指纹(Shazam 式)**:找频谱峰值点对做哈希,统计"时间偏移"直方图。
    同一段录音复用会在同一个偏移上砸出尖峰 —— 实测真值 3795 票 vs 第二名 228 票(16.6 倍)。

⚠️ 两个必须踩住的细节(都是实测出来的):
  1) 参考切片起点必须**对齐到 hop 的整数倍**。197×8000=1,576,000 不能被 256 整除,
     切片比目标错开 64 个采样点,同一段音频也提不出同一批峰 → 自匹配率 92% 掉到 32%。
  2) 峰值阈值必须用**逐帧相对阈值**(每帧减去自己的最大值),不能用全段百分位 ——
     否则 12 秒参考和 40 分钟正片的百分位基准不同,提出的峰不一致。

用法:
  python 29_bgm_scan.py scan --eps 34 35 36      # 小样本验证
  python 29_bgm_scan.py scan                     # 全 95 集
  python 29_bgm_scan.py scan --ref 197 201       # 换参考窗口(秒)
"""
import argparse
import json
import os
import subprocess
import sys
import time

import numpy as np
from scipy.ndimage import maximum_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "新三国")
WORK = os.path.join(HERE, "_bgm_work")

FFMPEG = r"F:\school_work\AIOT\dayao\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"

SR = 8000
N_FFT = 1024
HOP = 256                 # 32ms/帧
FAN = 6                   # 每个峰向后配对几个峰
DT_MAX = 100              # 配对最大时间差(帧) = 3.2s
PEAK_DB = -32.0           # 逐帧相对峰值阈值(dB,相对该帧最大值)

REF_EP = 34
REF_T0, REF_T1 = 197.0, 201.0    # 4 秒参考:够distinctive,且直方图宽度≈持续时长-4s
# 票数阈值按参考哈希数取比例(与参考长短无关)。实测 ep34 真值 1233/1265 票、
# 全片噪音地板 0.24 票/位置、第二名 8 票 —— 15% 这个线离两边都有百倍余量。
MIN_VOTES_FRAC = 0.15
MIN_VOTES_ABS = 60


def ep_path(ep):
    return os.path.join(SRC, "新三国%02d.mkv" % int(ep))


def decode(ep, out):
    subprocess.run([FFMPEG, "-v", "error", "-y", "-i", ep_path(ep), "-vn",
                    "-ac", "1", "-ar", str(SR), "-f", "f32le", out], check=True)
    return np.fromfile(out, dtype=np.float32)


def spectrogram(x):
    n = (x.size - N_FFT) // HOP + 1
    sw = np.lib.stride_tricks.sliding_window_view(x, N_FFT)[::HOP]
    b0, b1 = int(100 / (SR / N_FFT)), int(3000 / (SR / N_FFT))
    spec = np.empty((n, b1 - b0), dtype=np.float32)
    win = np.hanning(N_FFT).astype(np.float32)
    for i in range(0, n, 4000):
        j = min(i + 4000, n)
        blk = np.asarray(sw[i:j], dtype=np.float32) * win
        spec[i:j] = np.abs(np.fft.rfft(blk, axis=1))[:, b0:b1]
    spec = 20.0 * np.log10(spec + 1e-6)
    # 逐帧相对阈值 —— 与"这段音频多长/多响"无关,保证同一段音频提到同一批峰
    spec -= spec.max(axis=1, keepdims=True)
    return spec, b0


def landmarks(spec, b0):
    # 矩形极大值滤波 = 两次一维极大值滤波(可分离),比二维快 ~85 倍
    mx = maximum_filter1d(maximum_filter1d(spec, 13, axis=0, mode="nearest"),
                          13, axis=1, mode="nearest")
    fi, bi = np.nonzero((spec == mx) & (spec > PEAK_DB))
    # 每帧最多留 6 个最强峰
    amp = spec[fi, bi]
    order = np.lexsort((-amp, fi))
    fi, bi = fi[order], bi[order]
    keep = np.zeros(len(fi), dtype=bool)
    cnt = {}
    for k in range(len(fi)):
        c = cnt.get(fi[k], 0)
        if c < 6:
            keep[k] = True
            cnt[fi[k]] = c + 1
    fi, bi = fi[keep], bi[keep] + b0
    keys, times = [], []
    n = len(fi)
    for k in range(n):
        t0 = fi[k]
        f0 = bi[k]
        for m in range(k + 1, min(k + 1 + FAN, n)):
            dt = fi[m] - t0
            if dt <= 0:
                continue
            if dt > DT_MAX:
                break
            keys.append((int(f0) << 22) | (int(bi[m]) << 8) | dt)
            times.append(t0)
    return (np.array(keys, dtype=np.int64),
            np.array(times, dtype=np.int64), len(fi))


def match(ref_keys, ref_times, tgt_keys, tgt_times):
    """返回偏移直方图(下标 = 目标中参考起点所在的帧号)。"""
    o = np.argsort(ref_keys)
    rk, rt = ref_keys[o], ref_times[o]
    idx = np.searchsorted(rk, tgt_keys)
    np.clip(idx, 0, len(rk) - 1, out=idx)
    hit = rk[idx] == tgt_keys
    if not hit.any():
        return np.zeros(1, dtype=np.int64), 0
    offs = tgt_times[hit] - rt[idx[hit]]
    # 负偏移 = 参考会落在本集开始之前,物理上不存在(bincount 也不接受负数)
    offs = offs[offs >= 0]
    if offs.size == 0:
        return np.zeros(1, dtype=np.int64), 0
    return np.bincount(offs), int(offs.size)


def segments_from_hist(hist, ref_len_s, min_votes):
    """
    从偏移直方图里挑命中位置。
    注意:**峰是 1 帧宽(32ms)的尖峰**,不是平台 —— 因为哈希 key 里含帧间时间差,
    参考整体平移 1 帧就会配出另一批 key。所以这里只能给出"精确对齐点",
    "这次演奏持续了多久"必须另测(见 probe 模式)。
    """
    if len(hist) < 3:
        return []
    sm = np.convolve(hist, np.ones(3) / 3.0, mode="same")   # 只用来定位,票数要报原始的
    out = []
    used = np.zeros(len(hist), dtype=bool)
    for _ in range(6):
        c = int(np.argmax(np.where(used, 0, sm)))
        raw = int(hist[max(0, c - 2):c + 3].max())
        if raw < min_votes:
            break
        used[max(0, c - 30):c + 31] = True
        out.append({
            "start": round(c * HOP / SR, 1),
            "end": round(c * HOP / SR + ref_len_s, 1),   # 下界:这段参考本身确实在
            "votes": raw,
        })
    out.sort(key=lambda d: -d["votes"])
    return out


def do_probe(ep, at, lens, raw):
    """
    探测"某次演奏到底持续多久":从 at 秒开始,把参考逐级加长(4→8→...→lens 秒),
    看匹配率(命中票数 / 参考哈希数)在哪一级崩掉。崩掉的那一级就是真实长度。
    原理:只要参考整体都落在这次演奏里,哈希就几乎全中;一旦参考伸出演奏之外,
    多出来的那部分 key 在正片里找不到对应,匹配率立刻掉下来。
    """
    print("探测 ep%02d 起点 %.1fs 的演奏长度" % (ep, at))
    x = decode(ep, raw)
    spec, b0 = spectrogram(x)
    tk, tt, npt = landmarks(spec, b0)
    print("  正片哈希 %d 条\n" % len(tk))
    print("  %-8s %-8s %-10s %-10s %s" % ("参考长", "参考哈希", "命中票", "匹配率", "判定"))
    st = (int(at * SR) // HOP) * HOP
    best = 0
    for L in lens:
        e = st + int(L * SR)
        if e > x.size:
            break
        sref, b0r = spectrogram(x[st:e])
        rk, rt, _ = landmarks(sref, b0r)
        if len(rk) < 100:
            continue
        hist, _ = match(rk, rt, tk, tt)
        v = int(hist.max())
        rate = v / len(rk)
        ok = rate >= 0.5
        if ok:
            best = L
        print("  %-8s %-8d %-10d %-10s %s" % ("%ds" % L, len(rk), v, "%.0f%%" % (rate * 100),
                                              "✅ 整段都在演奏内" if ok else "❌ 参考已伸出演奏之外"))
        sys.stdout.flush()
    print("\n  → 本次演奏长度 ≥ %d 秒(匹配率崩在 %ds 之前)" % (best, best + 4))
    del x, spec, tk, tt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["scan", "probe"])
    ap.add_argument("--eps", type=int, nargs="*", default=None)
    ap.add_argument("--ref-ep", type=int, default=REF_EP)
    ap.add_argument("--ref", nargs=2, type=float, default=[REF_T0, REF_T1])
    ap.add_argument("--at", type=float, default=None, help="probe 模式:从第几秒开始")
    ap.add_argument("--probe-ep", type=int, default=None, help="probe 模式:测哪一集")
    ap.add_argument("--lens", type=int, nargs="*", default=[4, 8, 12, 16, 20, 26, 32, 40, 50, 60])
    ap.add_argument("--out", default=os.path.join(HERE, "bgm_scan_result.json"))
    a = ap.parse_args()

    os.makedirs(WORK, exist_ok=True)
    raw = os.path.join(WORK, "tmp_%d.raw" % os.getpid())   # 带 PID:允许多个实例并行

    if a.mode == "probe":
        if a.at is None:
            raise SystemExit("probe 需要 --at 秒")
        do_probe(a.probe_ep or REF_EP, a.at, a.lens, raw)
        if os.path.exists(raw):
            os.remove(raw)
        return

    # ---- 参考模板 ----
    t0, t1 = a.ref
    st = (int(t0 * SR) // HOP) * HOP            # 关键:对齐帧栅格
    print("提取参考模板 ep%02d %g-%gs ..." % (a.ref_ep, t0, t1))
    x = decode(a.ref_ep, raw)
    spec, b0 = spectrogram(x[int(st):int(t1 * SR)])
    rkeys, rtimes, rnpeaks = landmarks(spec, b0)
    ref_len_s = (int(t1 * SR) - st) / SR
    min_votes = max(MIN_VOTES_ABS, int(MIN_VOTES_FRAC * len(rkeys)))
    print("  参考峰 %d 个 → 哈希 %d 条 | 时长 %.2fs | 起点 %.3fs(已对齐帧栅格)"
          % (rnpeaks, len(rkeys), ref_len_s, st / SR))
    if len(rkeys) < 200:
        raise SystemExit("参考哈希太少,换一个参考窗口")
    del x, spec

    eps = a.eps if a.eps else list(range(1, 96))
    print("\n开始扫描 %d 集,每集 阈值=%d 票(参考哈希的 %d%%)\n"
          % (len(eps), min_votes, int(MIN_VOTES_FRAC * 100)))
    print("%-6s %-8s %-8s %-7s  %s" % ("集", "最佳票", "第二票", "倍率", "命中时间段(按时长)"))
    print("-" * 88)

    results = []
    t_start = time.time()
    for n, ep in enumerate(eps, 1):
        if not os.path.exists(ep_path(ep)):
            print("ep%-3d  !! 缺源片" % ep)
            continue
        ta = time.time()
        # 目标必须整段解码(帧栅格从采样 0 开始),不能对齐切片
        x = decode(ep, raw)
        spec, b0 = spectrogram(x)
        tk, tt, npeaks = landmarks(spec, b0)
        hist, total = match(rkeys, rtimes, tk, tt)
        # 参考集自身的位置是"平凡自匹配"(切出来的窗口当然在正片里找得到自己),
        # 必须挖掉,否则 ep34 只会报出参考窗口自己的位置,而漏掉同集内的其它真实出现。
        if ep == a.ref_ep:
            sf = st // HOP
            hist[max(0, sf - 40):sf + int(ref_len_s * SR / HOP) + 40] = 0
        # 无论过没过阈值都记下本集最高票 —— 用来判断"0 命中"是"真的没有",
        # 还是"阈值把真命中挡掉了"(如果最高票贴着阈值,就得警惕)。
        mx_all = int(hist.max()) if len(hist) else 0
        segs = segments_from_hist(hist, ref_len_s, min_votes)
        best = segs[0]["votes"] if segs else 0
        second = segs[1]["votes"] if len(segs) > 1 else 0
        ratio = (best / second) if second else float("inf")
        results.append({"ep": ep, "votes": best, "second": second, "segments": segs,
                        "max_votes": mx_all, "total_hash_hits": total, "peaks": npeaks})
        if segs:
            desc = " | ".join("%.0f-%.0fs(%ds,%d票)" % (s["start"], s["end"],
                             max(1, s["end"] - s["start"]), s["votes"]) for s in segs[:4])
            print("ep%-3d %-8d %-8d %-7s  %s" % (ep, best, second,
                  ("%.1f" % ratio) if second else "inf", desc))
        else:
            print("ep%-3d %-8d %-8s %-7s  -  (本集最高票 %d)" % (ep, best, "-", "-", mx_all))
        sys.stdout.flush()
        del x, spec, tk, tt

    if os.path.exists(raw):
        os.remove(raw)

    hit = [r for r in results if r["segments"]]
    print("-" * 88)
    print("命中 %d/%d 集 | 总耗时 %.1f 分钟 | 每集均 %.1fs"
          % (len(hit), len(eps), (time.time() - t_start) / 60, (time.time() - t_start) / max(1, len(eps))))
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump({"ref": {"ep": a.ref_ep, "t0": t0, "t1": t1, "hashes": int(len(rkeys))},
                   "results": results}, fh, ensure_ascii=False, indent=1)
    print("明细已写 %s" % a.out)


if __name__ == "__main__":
    main()
