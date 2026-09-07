# -*- coding: utf-8 -*-
"""全量 whisper 转写: 自动跳过已完成的集, 断点续跑
用法: python 26_whisper_all.py [startEp] [endEp]
输出: tools/whisper_out/ep{NN}.txt|.json
"""
import sys, os, json, time, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
os.environ.setdefault("OMP_NUM_THREADS", "4")
# nvidia pip dll 注入 PATH
_nv = r"E:\anaconda\Lib\site-packages\nvidia"
for _sub in ("cublas", "cuda_runtime", "cudnn"):
    _p = os.path.join(_nv, _sub, "bin")
    if os.path.isdir(_p):
        os.environ["PATH"] = _p + os.pathsep + os.environ.get("PATH", "")
SRC = r"F:\ownWork\天意宇宙\新三国"
OUT = r"F:\ownWork\天意宇宙\tools\whisper_out"

def run_ep(ep):
    os.makedirs(OUT, exist_ok=True)
    video = os.path.join(SRC, f"新三国{ep:02d}.mkv")
    if not os.path.exists(video):
        print(f"ep{ep:02d} 源文件缺失,跳过"); return
    t0 = time.time()
    from faster_whisper import WhisperModel
    try:
        model = WhisperModel("medium", device="cuda", compute_type="int8_float16")
        dev = "cuda"
    except Exception as e:
        print("cuda fail, fallback cpu:", e, flush=True)
        model = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=8)
        dev = "cpu"
    segments, info = model.transcribe(video, language="zh", vad_filter=True,
                                      beam_size=5, initial_prompt="以下是普通话电视剧对白。")
    rows = []
    for seg in segments:
        rows.append({"start": round(seg.start, 2), "end": round(seg.end, 2),
                     "text": seg.text.strip()})
    with open(os.path.join(OUT, f"ep{ep:02d}.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False)
    with open(os.path.join(OUT, f"ep{ep:02d}.txt"), "w", encoding="utf-8") as f:
        for r in rows:
            if r["text"]:
                f.write(f"{int(r['start'])}s {r['text']}\n")
    dur = info.duration if info and info.duration else 0
    print(f"ep{ep:02d} DONE {len(rows)} segs, audio {dur:.0f}s, "
          f"wall {(time.time()-t0)/60:.1f}min, speed {dur/(time.time()-t0):.1f}x ({dev})", flush=True)

start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
end = int(sys.argv[2]) if len(sys.argv) > 2 else 95

done = set()
if os.path.isdir(OUT):
    for f in os.listdir(OUT):
        if f.startswith("ep") and f.endswith(".txt") and f[2:4].isdigit():
            done.add(int(f[2:4]))
todo = [e for e in range(start, end + 1) if e not in done]
print(f"已完成 {len(done)} 集;本次待转 {len(todo)} 集", flush=True)

t_all = time.time()
for ep in todo:
    try:
        run_ep(ep)
    except Exception as e:
        print(f"ep{ep} FAIL {repr(e)[:200]}", flush=True)
print(f"ALL DONE {len(todo)} eps in {(time.time()-t_all)/60:.1f}min", flush=True)
