# -*- coding: utf-8 -*-
"""faster-whisper 批量转写: 把一集/多集音轨转成带时间戳的台词文本
用法: python 20_whisper_scan.py <ep> [ep...]  (ep 为1-95)
     python 20_whisper_scan.py 1 5 90
输出: whisper_out/ep{NN}.json  [{start,end,text}]
     whisper_out/ep{NN}.txt   "秒s 文本" 每行(与fine_full同格式,便于复用检索)
模型: medium(int8) GPU优先,失败回落CPU
"""
import sys, os, json, time, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
os.environ.setdefault("OMP_NUM_THREADS", "4")
# nvidia pip dll 注入 PATH(cublas/cudnn),让 ctranslate2 GPU 可用
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
    t0 = time.time()
    from faster_whisper import WhisperModel
    # medium int8 GPU; 失败自动回落 CPU
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
    jp = os.path.join(OUT, f"ep{ep:02d}.json")
    with open(jp, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False)
    # txt 同格式输出,便于 Select-String
    tp = os.path.join(OUT, f"ep{ep:02d}.txt")
    with open(tp, "w", encoding="utf-8") as f:
        for r in rows:
            if r["text"]:
                f.write(f"{int(r['start'])}s {r['text']}\n")
    dur = info.duration if info and info.duration else 0
    print(f"ep{ep:02d} DONE {len(rows)} segs, audio {dur:.0f}s, "
          f"wall {(time.time()-t0)/60:.1f}min, speed {dur/(time.time()-t0):.1f}x ({dev})", flush=True)

if __name__ == "__main__":
    eps = [int(a) for a in sys.argv[1:]] if len(sys.argv) > 1 else [1]
    for ep in eps:
        run_ep(ep)
