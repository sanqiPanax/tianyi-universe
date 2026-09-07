// 批量粗扫: 并发跑剩余集
// 用法: node 14_batch.js [并发数] [起始集] [结束集]
// 已存在的 ep*.txt 自动跳过(断点续跑)
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const PY = 'E:/anaconda/python.exe';
const SCRIPT = path.join(__dirname, '14_coarse_scan.py');
const RES = path.join(__dirname, 'coarse_results');

const concurrency = parseInt(process.argv[2] || '2');
const from = parseInt(process.argv[3] || '1');
const to = parseInt(process.argv[4] || '95');

const done = new Set();
if (fs.existsSync(RES)) {
  fs.readdirSync(RES).forEach(f => {
    const m = f.match(/^ep(\d+)\.txt$/);
    if (m && fs.statSync(path.join(RES, f)).size > 0) done.add(parseInt(m[1]));
  });
}
const queue = [];
for (let ep = from; ep <= to; ep++) {
  if (!done.has(ep)) queue.push(ep);
}
console.log(`pending: ${queue.length} eps (${queue.join(',')})`);

let idx = 0;
let active = 0;
const t0 = Date.now();

function next() {
  while (active < concurrency && idx < queue.length) {
    const ep = queue[idx++];
    active++;
    const child = execFile(PY, [SCRIPT, String(ep), ''], { timeout: 600000 }, (err) => {
      active--;
      if (err) console.log(`ep${ep} ERR ${err.code || err.message}`);
      else console.log(`ep${ep} done (${((Date.now() - t0) / 60000).toFixed(1)}min)`);
      next();
    });
  }
  if (active === 0 && idx >= queue.length) {
    console.log(`ALL DONE ${queue.length} eps in ${((Date.now() - t0) / 60000).toFixed(1)}min`);
    process.exit(0);
  }
}
next();
