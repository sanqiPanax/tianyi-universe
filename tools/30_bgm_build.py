#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
30_bgm_build.py —— 把扫描出的「关羽之歌」片段拼成一条 60~90 秒的循环 BGM。

输入 = 29_bgm_scan.py 产出的 bgm_scan_result.json(每个命中位置都是**哈希验证过**的:
      该位置的 12 秒与 ep34 197-209s 是同一段录音)。
输出 = assets/bgm-guanyuzhige.mp3

做法:每个命中位置切 12 秒 → 相邻之间 1.5 秒交叉淡化 → 末尾统一响度。
      7 段 = 7×12 − 6×1.5 = 75 秒。

用法:
  python 30_bgm_build.py                 # 自动挑,拼 75 秒
  python 30_bgm_build.py --want 66       # 目标秒数
  python 30_bgm_build.py --single 34:197:72   # 单段长镜头(不拼接),用于对比试听
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "新三国")
ASSETS = os.path.join(ROOT, "assets")
WORK = os.path.join(HERE, "_bgm_work")

FFMPEG = r"F:\school_work\AIOT\dayao\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"

SEG = 12.0          # 每段长度(秒) —— 等于参考长度,保证整段都是被验证过的内容
XFADE = 1.5         # 交叉淡化
MIN_GAP_SAME_EP = 30.0
LOUDNORM = "loudnorm=I=-20:TP=-3:LRA=11"


def ep_path(ep):
    return os.path.join(SRC, "新三国%02d.mkv" % int(ep))


def extract(ep, start, dur, out):
    subprocess.run([FFMPEG, "-v", "error", "-y",
                    "-ss", "%.3f" % start, "-t", "%.3f" % dur,
                    "-i", ep_path(ep), "-vn", "-ac", "2", "-ar", "44100",
                    "-c:a", "pcm_s16le", out], check=True)


def pick(cands, want):
    """贪心挑:candidates 按票数排序;同集内间隔 >= MIN_GAP_SAME_EP;优先不同集。"""
    chosen, used_eps, used_t = [], set(), {}
    # 第一轮:每集只取一个(优先没出现过的集)
    for c in cands:
        if len(chosen) >= 40:
            break
        ep = c["ep"]
        if ep in used_eps:
            continue
        if any(abs(c["start"] - t) < MIN_GAP_SAME_EP for t in used_t.get(ep, [])):
            continue
        chosen.append(c)
        used_eps.add(ep)
        used_t.setdefault(ep, []).append(c["start"])
    # 第二轮:还不够就从已用过的集里再取(间隔约束仍在)
    for c in cands:
        if len(chosen) >= 40:
            break
        if c in chosen:
            continue
        if any(abs(c["start"] - t) < MIN_GAP_SAME_EP for t in used_t.get(c["ep"], [])):
            continue
        chosen.append(c)
        used_t.setdefault(c["ep"], []).append(c["start"])
    n = max(2, int(round((want - XFADE) / (SEG - XFADE))))
    return chosen[:n]


def build(segs, out_path):
    os.makedirs(WORK, exist_ok=True)
    files = []
    for i, s in enumerate(segs):
        p = os.path.join(WORK, "seg%02d.wav" % i)
        extract(s["ep"], s["start"], SEG, p)
        files.append(p)
        print("  段%d  ep%02d %7.1fs  %d票  %s" % (i + 1, s["ep"], s["start"], s["votes"],
              "%.1fs" % (s["end"] - s["start"])))
    # 链式交叉淡化
    parts, prev = [], "[0]"
    for i in range(1, len(files)):
        lab = "[a%d]" % i
        parts.append("%s[%d]acrossfade=d=%.2f:c1=tri:c2=tri%s" % (prev, i, XFADE, lab))
        prev = lab
    chain = ";".join(parts)
    chain += ("%s%s" % (prev if parts else "[0]", ",%s" % LOUDNORM))
    cmd = [FFMPEG, "-v", "error", "-y"]
    for f in files:
        cmd += ["-i", f]
    cmd += ["-filter_complex", chain, "-map", prev if parts else "[0]",
            "-c:a", "libmp3lame", "-b:a", "128k", "-ar", "44100", "-ac", "2", out_path]
    subprocess.run(cmd, check=True)
    total = len(files) * SEG - (len(files) - 1) * XFADE
    print("\n拼成 %d 段 → %.1f 秒 → %s (%.2f MB)"
          % (len(files), total, out_path, os.path.getsize(out_path) / 1048576))
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--want", type=float, default=75.0)
    ap.add_argument("--result", default=os.path.join(HERE, "bgm_scan_result.json"))
    ap.add_argument("--out", default=os.path.join(ASSETS, "bgm-guanyuzhige.mp3"))
    ap.add_argument("--single", default=None, help="单段长镜头 ep:start:len,不拼接")
    a = ap.parse_args()
    os.makedirs(ASSETS, exist_ok=True)

    if a.single:
        ep, st, ln = a.single.split(":")
        out = a.out.replace(".mp3", "-single.mp3")
        extract(int(ep), float(st), float(ln), os.path.join(WORK, "single.wav"))
        subprocess.run([FFMPEG, "-v", "error", "-y", "-i", os.path.join(WORK, "single.wav"),
                        "-filter_complex", LOUDNORM, "-c:a", "libmp3lame", "-b:a", "128k",
                        "-ar", "44100", "-ac", "2", out], check=True)
        print("单段 %ss → %s (%.2f MB)" % (ln, out, os.path.getsize(out) / 1048576))
        return

    with open(a.result, encoding="utf-8") as fh:
        data = json.load(fh)
    cands = []
    for r in data["results"]:
        for s in r.get("segments", []):
            cands.append({"ep": r["ep"], "start": s["start"], "end": s["end"], "votes": s["votes"]})
    cands.sort(key=lambda c: -c["votes"])
    print("候选 %d 个(来自 %d 集)" % (len(cands), len({c["ep"] for c in cands})))
    segs = pick(cands, a.want)
    if len(segs) < 2:
        raise SystemExit("候选不足,无法拼接")
    build(segs, a.out)


if __name__ == "__main__":
    main()
