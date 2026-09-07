// clip 校准助手: 对每个已剪 clip, 取其台词关键词在对应集 whisper 转写里检索
// 报告: 命中/未命中, 辅助发现裁错集/窗口的 clip
// 用法: node 28_verify_clips.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function load(file) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx);
  return ctx.window;
}
const { DATA_NODES: nodes, DATA_CLIPS: clips } = (() => {
  const n = load('data/nodes.js');
  const c = load('data/clips.js');
  return { DATA_NODES: n.DATA_NODES, DATA_CLIPS: c.DATA_CLIPS };
})();

// 台词去标点取前6字作为关键词(含引号内台词)
function keywords(node) {
  const line = node.line || '';
  // 取引号内文字优先
  const q = line.match(/[「"'']([^「"'']{4,})[」"']/);
  const core = q ? q[1] : line;
  const clean = core.replace(/[（(].*?[)）]/g, '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
  // 取 5-8 字片段
  const kws = [];
  for (const seg of [clean.slice(0, 6), clean.slice(clean.length - 6)]) {
    if (seg.length >= 4) kws.push(seg);
  }
  return kws;
}

const whisperDir = path.join(__dirname, 'whisper_out');
function epText(epNum) {
  const f = path.join(whisperDir, `ep${String(epNum).padStart(2, '0')}.txt`);
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8');
}

const report = [];
for (const n of nodes) {
  if (!clips[n.id]) continue;
  const epsInLine = (n.ep || '').match(/\d+/g);
  const eps = epsInLine ? epsInLine.map(Number) : [];
  if (!eps.length) { report.push({ id: n.id, ep: n.ep, status: '无集号,跳过' }); continue; }
  const kws = keywords(n);
  if (!kws.length) { report.push({ id: n.id, ep: n.ep, status: '无关键词,跳过' }); continue; }
  const checked = [];
  for (const ep of eps) {
    const txt = epText(ep);
    if (!txt) { checked.push(`ep${ep}未转`); continue; }
    const hit = kws.some(kw => txt.includes(kw));
    checked.push(`ep${ep}${hit ? '✅' : '❌'}`);
  }
  report.push({ id: n.id, ep: n.ep, status: checked.join(' '), kws: kws.join('/') });
}
for (const r of report) {
  console.log(`${r.status} | ${r.id} | ep:${r.ep}${r.kws ? ' | 词:' + r.kws : ''}`);
}
