# -*- coding: utf-8 -*-
"""单集粗扫(45s间隔)找关键词窗口 — 输出到文件
用法: python 14_coarse_scan.py <ep> <kw1,kw2,...>
"""
import sys, os, io, subprocess, json, time, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
os.environ["OMP_NUM_THREADS"] = "2"

FFMPEG = r"F:\school_work\AIOT\dayao\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
SRC = r"F:\ownWork\天意宇宙\新三国"
FR = r"F:\ownWork\天意宇宙\tools\_coarse"
RES = r"F:\ownWork\天意宇宙\tools\coarse_results"

def main():
    ep = int(sys.argv[1])
    kws = sys.argv[2].split(",") if len(sys.argv) > 2 else []
    video = os.path.join(SRC, f"新三国{ep:02d}.mkv")
    rp = os.path.join(RES, f"ep{ep}.txt")
    if os.path.exists(rp) and os.path.getsize(rp) > 0:
        print(f"ep{ep} exists, skip")
        return
    fd = os.path.join(FR, f"ep{ep}")
    os.makedirs(RES, exist_ok=True)
    if os.path.exists(fd):
        shutil.rmtree(fd)
    os.makedirs(fd)
    # 抽全帧,45s间隔(0.0222fps),底部字幕条裁更宽(200px)提升识别
    r = subprocess.run([FFMPEG, "-v", "error", "-y", "-i", video,
                        "-vf", "fps=1/45,crop=iw:200:0:ih-200",
                        "-q:v", "3", os.path.join(fd, "f%03d.png")],
                       capture_output=True, errors="replace")
    if r.returncode != 0:
        print("extract fail", r.stderr[-200:]); return
    files = sorted(os.listdir(fd))
    print(f"ep{ep} coarse frames={len(files)}", flush=True)

    from rapidocr_onnxruntime import RapidOCR
    ocr = RapidOCR()
    t0 = time.time()
    out_lines = []
    for i, fn in enumerate(files):
        p = os.path.join(fd, fn)
        try:
            res, _ = ocr(p)
        except Exception:
            res = None
        if res:
            txt = "".join(line[1] for line in res).strip()
            if txt:
                t = i * 45
                hit = [k for k in kws if k in txt]
                flag = " <<<" + ",".join(hit) if hit else ""
                out_lines.append(f"[{t//60}:{t%60:02d}] {txt}{flag}")
        if i % 20 == 0:
            print(f"  {i}/{len(files)} {(time.time()-t0):.0f}s", flush=True)
    shutil.rmtree(fd)
    with open(rp, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines))
    print(f"DONE ep{ep} -> {rp} {(time.time()-t0)/60:.1f}min")

if __name__ == "__main__":
    main()
