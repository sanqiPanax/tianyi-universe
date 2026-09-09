# -*- coding: utf-8 -*-
# 天意宇宙 · 梗雷达 (whisper_index.py) v2
# 原句考证: 候选台词 → 95集 whisper 转写 模糊匹配(whisper 错字多,必须容错)
# 两段式: 集级 bigram 覆盖率粗筛(≥0.45 才精扫) → 行级锚点命中 + bigram 覆盖率排序
# CLI: python whisper_index.py "台词..."
import os, re, sys, io, time

HERE = os.path.dirname(os.path.abspath(__file__))
WHISPER_DIR = os.path.normpath(os.path.join(HERE, '..', 'whisper_out'))

PUNC = "，。！？、；：\u201c\u201d\u2018\u2019（）…—·《》【】\u3000,.!?;:()\u0027\\-~～+×xX \t"
_PUNC_RE = re.compile('[' + re.escape(PUNC) + '\\s]+')
def clean(s):
    return _PUNC_RE.sub('', str(s or ''))

def bigrams(s):
    c = clean(s); return [c[i:i+2] for i in range(len(c) - 1)]

def split_anchors(line, min_len=3, max_len=6):
    c = clean(line); out = []
    for i in range(0, len(c), 3):
        out.append(c[i:min(i + max_len, len(c))])
    return [a for a in out if a and len(a) >= min_len]

def fmt(sec):
    return f"{sec // 60}:{sec % 60:02d}"

class WhisperIndex:
    def __init__(self, whisper_dir=WHISPER_DIR):
        self.eps = {}   # ep -> [(sec, text)]
        self.full = {}  # ep -> 拼接全文(去标点)
        t0 = time.time()
        for f in sorted(os.listdir(whisper_dir)):
            m = re.match(r'^ep(\d+)\.txt$', f)
            if not m: continue
            ep = int(m.group(1)); rows = []
            for ln in open(os.path.join(whisper_dir, f), encoding='utf-8'):
                ln = ln.rstrip('\n').rstrip('\r')
                mm = re.match(r'^(\d+)s\s+(.*)$', ln)
                if mm: rows.append((int(mm.group(1)), mm.group(2)))
            if rows:
                self.eps[ep] = rows
                self.full[ep] = clean(''.join(t for _, t in rows))
        self.load_sec = time.time() - t0

    # ---------- 查询 ----------
    def _coarse_eps(self, cand_bg, thr=0.45):
        """集级粗筛: 候选 bigram 在集全文覆盖率 ≥thr 的集"""
        hits = []
        for ep, ftext in self.full.items():
            if not ftext or not cand_bg: continue
            n = 0
            for b in cand_bg:
                if b in ftext: n += 1
            if n / len(cand_bg) >= thr:
                hits.append((ep, n / len(cand_bg)))
        hits.sort(key=lambda x: -x[1])
        return hits

    def search(self, line, top=6, coarse_thr=0.45):
        """候选台词 → 精扫命中的行级结果列表
        每行: {ep, sec, text, anchor_hit, anchors, rate} 按 (anchor_hit, rate) 排序"""
        c = clean(line)
        if len(c) < 4: return []
        anchors = split_anchors(c)
        cand_bg = set(bigrams(c))
        if not cand_bg: return []
        out = []
        for ep, cov in self._coarse_eps(cand_bg):
            for sec, text in self.eps[ep]:
                t = clean(text)
                if not t: continue
                ah = sum(1 for a in anchors if a in t) if anchors else 0
                if ah == 0:
                    tb = set(bigrams(t))
                    rate = len(cand_bg & tb) / len(cand_bg)
                    if rate < 0.5: continue
                else:
                    tb = set(bigrams(t))
                    rate = len(cand_bg & tb) / len(cand_bg)
                out.append({'ep': ep, 'sec': sec, 'text': text,
                            'anchor_hit': ah, 'anchors': len(anchors),
                            'rate': round(rate, 2), 'cov': round(cov, 2)})
        out.sort(key=lambda h: (h['anchor_hit'] >= 1, h['rate']), reverse=True)
        # 合并同集邻近(±20s)去重, 保留最佳
        merged, seen_ep = [], set()
        for h in out:
            if h['ep'] in seen_ep: continue
            seen_ep.add(h['ep']); merged.append(h)
            if len(merged) >= top: break
        return merged

    def verify_line(self, line):
        """一行结论: 命中返回 (strong, ep, mm:ss, text, rate); 无命中 None"""
        hits = self.search(line)
        if not hits:
            # 超弱匹配: 只有 bigram 覆盖率(不要求锚点) 兜底, 误报高 → 判未定位
            return None
        h = hits[0]
        strong = h['anchor_hit'] >= 1 and h['rate'] >= 0.5
        return {'strong': strong, 'ep': h['ep'], 'sec': h['sec'], 'text': h['text'],
                'rate': h['rate'], 'anchor_hit': h['anchor_hit']}

    def verify_line_text(self, line):
        r = self.verify_line(line)
        if not r:
            return '❌ 原片未检索到(疑似纯二创/空耳/新编,待人工核实)'
        tag = '✅' if r['strong'] else '⚠️'
        return f"{tag} ep{r['ep']:02d} {fmt(r['sec'])} 「{r['text']}」 (rate {r['rate']})"

    def occurrences(self, line):
        """该句(去标点)在全剧 95 集里出现的不同集数与总行数 → 判定泛用口语(>3集多为通用对白)"""
        c = clean(line)
        if len(c) < 3: return (0, 0)
        cand_bg = set(bigrams(c))
        if not cand_bg: return (0, 0)
        eps_hit, rows_hit = set(), 0
        for ep, _cov in self._coarse_eps(cand_bg, thr=0.5):
            full_text = self.full[ep]
            if len(c) >= 3 and c in full_text:
                eps_hit.add(ep); rows_hit += 1
                continue
            for sec, text in self.eps[ep]:
                t = clean(text)
                if not t or len(t) < 3: continue
                if c in t or (len(c) <= len(t) + 2 and len(set(bigrams(c)) & set(bigrams(t))) / len(set(bigrams(c))) >= 0.8):
                    eps_hit.add(ep); rows_hit += 1
        return len(eps_hit), rows_hit

def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    idx = WhisperIndex()
    print(f'[load] {len(idx.eps)} 集 {idx.load_sec:.1f}s')
    for arg in sys.argv[1:]:
        print(f'\n### {arg}')
        print(idx.verify_line_text(arg))
        for h in idx.search(arg, top=3):
            print(f'    ~ ep{h["ep"]:02d} {fmt(h["sec"])} 「{h["text"]}」 anchor{h["anchor_hit"]}/{h["anchors"]} rate{h["rate"]}')

if __name__ == '__main__':
    main()
