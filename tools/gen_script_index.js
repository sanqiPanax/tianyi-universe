// 天意宇宙 · 全剧台词索引生成器(改进#4: 网页搜索框用)
// 读 tools/whisper_out/epNN.txt(每行 "秒s 文本")→ 输出 data/script_index.js
// window.DATA_SCRIPT = { "ep01": ["3 文本", "9 文本", ...], ... }
// 紧凑格式: 每行字符串 "秒 文本", 网页端搜索时逐行 includes; 60k 行 ~1.8MB, file:// 可用 script 标签直接载入
// 用法: node tools/gen_script_index.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'tools', 'whisper_out');
const OUT = path.join(ROOT, 'data', 'script_index.js');

const eps = [];
for (let i = 1; i <= 95; i++) {
  const p = path.join(SRC_DIR, `ep${String(i).padStart(2, '0')}.txt`);
  if (!fs.existsSync(p)) { console.warn('missing', p); continue; }
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  const arr = [];
  for (const raw of lines) {
    const m = raw.match(/^(\d+)s\s+(.+)$/);
    if (!m) continue;
    let text = m[2].trim();
    if (!text || text.length < 2) continue;
    // 防 JS 字符串破坏
    text = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\u0000-\u001f]/g, '');
    arr.push(`${m[1]} ${text}`);
  }
  if (arr.length) eps.push(`"ep${String(i).padStart(2, '0')}":[${arr.map(s => '"' + s + '"').join(',')}]`);
}
const totalLines = eps.reduce((a, e) => a + (e.match(/,/g) || []).length + 1, 0);
const js = '// 天意宇宙 · 全剧 95 集逐句台词索引(自动生成,勿手改)\n// 来源 tools/whisper_out/epNN.txt(faster-whisper 转写,同音字可能有误)\n// 格式: DATA_SCRIPT[ep] = ["秒 文本", ...]; 用法见 index.html 搜索框\nwindow.DATA_SCRIPT = {\n' + eps.join(',\n') + '\n};\n';
fs.writeFileSync(OUT, js, 'utf8');
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`OK → ${OUT}  ${kb} KB  ${eps.length} 集  ~${totalLines} 行`);
