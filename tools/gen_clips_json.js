// 扫描 clips/ 目录生成 clips.json(网页用来标记"可播放"节点)
// 用法: node gen_clips_json.js
const fs = require('fs');
const path = require('path');
const clipsDir = path.join(__dirname, '..', 'clips');
const outPath = path.join(__dirname, '..', 'clips.json');
if (!fs.existsSync(clipsDir)) { console.log('no clips dir'); process.exit(0); }
const map = {};
for (const f of fs.readdirSync(clipsDir)) {
  const m = f.match(/^(.+)\.(mp3|mp4)$/);
  if (!m) continue;
  const [, id, ext] = m;
  if (!map[id]) map[id] = {};
  map[id][ext] = true;
}
// 输出为 window.CLIPS = {...} 的 JS(便于 file:// 直接 <script> 引入)
const jsOut = path.join(__dirname, '..', 'data', 'clips.js');
fs.writeFileSync(jsOut, '// 已剪辑素材清单(由 gen_clips_json.js 生成)\nwindow.DATA_CLIPS = ' + JSON.stringify(map) + ';\n');
console.log('clips.js written:', Object.keys(map).length, 'items');

