# -*- coding: utf-8 -*-
"""全文本精扫: 窗口内逐帧OCR, 全部文本落盘(不论是否命中), 便于人工核验
用法: python 16_fulltext_scan.py <ep> <startSec> <endSec> [stepSec=2]
输出: fine_full/ep{ep}_{s0}_{s1}.txt 每行 "t秒 text"
"""
import sys, os, io, subprocess, time, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
os.environ["OMP_NUM_THREADS"] = "2"

FFMPEG = r"F:\school_work\AIOT\dayao\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
SRC = r"F:\ownWork\天意宇宙\新三国"
FR = r"F:\ownWork\天意宇宙\tools\_full"
OUTD = r"F:\ownWork\天意宇宙\tools\fine_full"

def main():
    ep = int(sys.argv[1]); s0 = int(sys.argv[2]); s1 = int(sys.argv[3])
    step = float(sys.argv[4]) if len(sys.argv) > 4 else 2
    video = os.path.join(SRC, f"新三国{ep:02d}.mkv")
    fd = os.path.join(FR, f"ep{ep}")
    os.makedirs(OUTD, exist_ok=True)
    if os.path.exists(fd): shutil.rmtree(fd)
    os.makedirs(fd)
    r = subprocess.run([FFMPEG, "-v", "error", "-y", "-ss", str(s0), "-i", video,
                        "-t", str(s1 - s0), "-vf", f"fps={1/step},crop=iw:160:0:ih-160",
                        "-q:v", "3", os.path.join(fd, "f%05d.png")],
                       capture_output=True, errors="replace")
    if r.returncode != 0:
        print("extract fail", r.stderr[-300:]); return
    files = sorted(os.listdir(fd))
    from rapidocr_onnxruntime import RapidOCR
    ocr = RapidOCR()
    t0 = time.time()
    rows = []
    for i, fn in enumerate(files):
        p = os.path.join(fd, fn)
        try:
            res, _ = ocr(p)
        except Exception:
            res = None
        os.remove(p)
        if res:
            txt = "".join(line[1] for line in res).strip()
            if txt:
                rows.append(f"{int(s0 + i * step)}s {txt}")
        if i % 100 == 0:
            print(f"  {i}/{len(files)} {(time.time()-t0):.0f}s", flush=True)
    shutil.rmtree(fd)
    rp = os.path.join(OUTD, f"ep{ep}_{s0}_{s1}.txt")
    with open(rp, "w", encoding="utf-8") as f:
        f.write("\n".join(rows))
    print(f"DONE {len(rows)} rows -> {rp}")

if __name__ == "__main__":
    main()
