// whisper 转写结果批量检索工具
// 用法: node 25_whisper_search.js <关键词1> [关键词2...]
// 在所有 whisper_out/*.txt 里搜词,输出 集+秒+文本
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'whisper_out');

const kws = process.argv.slice(2);
if (!kws.length) { console.log('用法: node 25_whisper_search.js 词1 词2...'); process.exit(0); }

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.txt') && /^ep\d+\.txt$/.test(f)).sort();
const epMap = new Map();
for (const f of files) {
  const ep = parseInt(f.match(/^ep(\d+)/)[1]);
  const rows = fs.readFileSync(path.join(DIR, f), 'utf8').split('\n')
    .map(l => l.replace(/\r$/, '')).filter(Boolean)
    .map(l => { const m = l.match(/^(\d+)s (.*)$/); return m ? { sec: +m[1], text: m[2] } : null; })
    .filter(Boolean);
  epMap.set(ep, rows);
}

for (const kw of kws) {
  console.log(`\n### 检索: ${kw}`);
  let hits = 0;
  for (const [ep, rows] of epMap) {
    for (const r of rows) {
      if (r.text.includes(kw)) {
        const mm = Math.floor(r.sec / 60), ss = r.sec % 60;
        console.log(`  ep${String(ep).padStart(2, '0')} ${mm}:${String(ss).padStart(2, '0')} ${r.text}`);
        hits++;
      }
    }
  }
  if (!hits) console.log('  (无命中)');
}
