// Phase 2: 自动匹配 — 用粗扫索引为每个梗定位"候选集"
// 容错: 把梗台词切成中文bigram,OCR文本命中率>=阈值即判该集含此梗
// 用法: node auto_phase2.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RES = path.join(__dirname, 'coarse_results');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'nodes.js'), 'utf8'), ctx);
const NODES = ctx.window.DATA_NODES;

// 读取粗扫索引 ep -> [{min, text}]
const index = {};
for (const f of fs.readdirSync(RES).filter(x => /^ep\d+\.txt$/.test(x))) {
  const ep = parseInt(f.match(/^ep(\d+)/)[1]);
  const recs = [];
  for (const ln of fs.readFileSync(path.join(RES, f), 'utf8').split('\n')) {
    const m = ln.replace(/\r$/, '').match(/^\[(\d+):(\d+)\]\s*(.*)$/);
    if (m) recs.push({ min: +m[1] * 60 + +m[2], text: m[3] });
  }
  index[ep] = recs;
}

// 提取台词锚点(去标点空格,取关键句)
function clean(s) { return String(s || '').replace(/[，。！？、；：""''（）…—·\s]/g, ''); }
// 中文bigram
function bigrams(s) {
  const c = clean(s);
  const out = [];
  for (let i = 0; i < c.length - 1; i++) out.push(c.slice(i, i + 2));
  return out;
}
// 匹配率: OCR文本的bigram集合 覆盖 锚点bigram 的比例(锚点在文本中需连续出现? 不,用窗口近似)
// 简化可靠法: 锚点切成3-6字短词,任一短词在文本中命中即强信号;无命中则看bigram覆盖率
function splitAnchors(line, minLen = 3, maxLen = 6) {
  const c = clean(line);
  const anchors = [];
  for (let i = 0; i + minLen <= c.length; i += 3) {
    anchors.push(c.slice(i, Math.min(i + maxLen, c.length)));
  }
  return anchors.filter(a => a.length >= minLen);
}
function matchLine(line, ocrText) {
  const anchors = splitAnchors(line);
  if (!anchors.length) return null;
  const hit = anchors.filter(a => ocrText.includes(a));
  if (hit.length >= 1) return { rate: hit.length / anchors.length, anchors: anchors.length, hit: hit.length };
  // 次优: bigram 覆盖
  const ab = bigrams(line);
  const ob = new Set();
  for (let i = 0; i < ocrText.length - 1; i++) ob.add(ocrText.slice(i, i + 2));
  let n = 0;
  for (const b of ab) if (ob.has(b)) n++;
  const rate = ab.length ? n / ab.length : 0;
  if (rate >= 0.55) return { rate, anchors: anchors.length, hit: 0 };
  return null;
}

const results = [];
for (const node of NODES) {
  const line = node.line;
  if (!line || node.type === 'mech' || node.type === 'cast' || node.type === 'prop') continue; // 机制/演员/道具梗无固定台词
  const hits = [];
  for (const [ep, recs] of Object.entries(index)) {
    for (const r of recs) {
      const m = matchLine(line, r.text);
      if (m) hits.push({ ep: +ep, min: r.min, ...m });
    }
  }
  // 合并同集邻近
  const byEp = {};
  for (const h of hits) {
    if (!byEp[h.ep]) byEp[h.ep] = [];
    byEp[h.ep].push(h);
  }
  const cands = [];
  for (const [ep, hs] of Object.entries(byEp)) {
    hs.sort((a, b) => a.min - b.min);
    // 取该集最高命中率记录
    const best = hs.reduce((a, b) => (a.rate >= b.rate ? a : b));
    cands.push({ ep: +ep, min: best.min, rate: best.rate, hits: hs.length });
  }
  cands.sort((a, b) => b.rate - a.rate);
  results.push({ id: node.id, name: node.name, pop: node.pop, cands: cands.slice(0, 3) });
}

// 输出
const have = results.filter(r => r.cands.length);
const none = results.filter(r => !r.cands.length);
console.log('===== 自动匹配结果 =====');
console.log(`梗总数(有台词): ${results.length} | 匹配到候选集: ${have.length} | 未匹配: ${none.length}`);
console.log('\n--- 匹配到(梗 | 候选集:ep分钟/命中率) ---');
for (const r of have) {
  console.log(`${r.name} | pop${r.pop} | ${r.cands.map(c => `ep${c.ep}@${Math.floor(c.min/60)}:${String(c.min%60).padStart(2,'0')}(rate${c.rate.toFixed(2)})`).join(' ')}`);
}
console.log('\n--- 未匹配(需密集扫全集或人工) ---');
for (const r of none) console.log(`- ${r.name}`);
// 落盘
const out = { have, none };
fs.writeFileSync(path.join(__dirname, 'phase2_result.json'), JSON.stringify(out, null, 1));
console.log('\nsaved -> tools/phase2_result.json');
