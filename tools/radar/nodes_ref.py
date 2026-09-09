# -*- coding: utf-8 -*-
# 天意宇宙 · 梗雷达 (nodes_ref.py)
# 从 data/nodes.js 提取已有 83 节点, 供候选查重
import os, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
NODES_FILE = os.path.normpath(os.path.join(HERE, '..', '..', 'data', 'nodes.js'))

def load_nodes(path=NODES_FILE):
    """正则抓取 nodes.js 里的 { id, name, line, why, type, pop }"""
    txt = open(path, encoding='utf-8').read()
    recs = re.findall(r'\{([^{}]*?)\}', txt, re.S)
    out = []
    for r in recs:
        def grab(key):
            m = re.search(r'\b' + key + r'\s*:\s*"((?:[^"\\]|\\.)*)"', r)
            return m.group(1) if m else ''
        if not grab('id'): continue
        out.append({
            'id': grab('id'), 'name': grab('name'), 'line': grab('line'),
            'why': grab('why'), 'type': grab('type'), 'pop': grab('pop'),
        })
    return out

_PUNC2 = "，。！？、；：\u201c\u201d\u2018\u2019（）…—·《》【】,.!?;:()\u0027\\-~～+×xX "
_PUNC2_RE = re.compile('[' + re.escape(_PUNC2) + '\\s\\W]+')
def punc_clean(s):
    """去标点/空白/符号 → 纯中英文数字串"""
    return _PUNC2_RE.sub('', str(s or ''))

def sig(s):
    """查重用签名: 去掉标点后的子串(取 6-12 字核心)"""
    c = punc_clean(s)
    if len(c) <= 8: return c
    # 取最长连续中文段前12字
    return c[:12]

def check_dup(candidate, nodes, thresh=0.5):
    """候选文本与已有节点的 line/name 做 bigram 相似度 → 返回 (matched_node_or_None, sim)"""
    cand_bg = set()
    c = punc_clean(candidate)
    for i in range(len(c) - 1): cand_bg.add(c[i:i+2])
    if not cand_bg: return None, 0
    best_n, best_s = None, 0
    for nd in nodes:
        for field in ('line', 'name'):
            t = punc_clean(nd.get(field) or '')
            tb = set()
            for i in range(len(t) - 1): tb.add(t[i:i+2])
            if not tb: continue
            sim = len(cand_bg & tb) / len(cand_bg)  # 候选覆盖度
            if sim > best_s:
                best_s = sim; best_n = nd
    if best_n and best_s >= thresh:
        return best_n, round(best_s, 2)
    return None, round(best_s, 2)

if __name__ == '__main__':
    import sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    ns = load_nodes()
    print(f'[nodes] {len(ns)}')
    for q in sys.argv[1:]:
        m, s = check_dup(q, ns)
        print(f'{q} → {m["id"] + " " + m["name"] if m else "无"} (sim {s})')
