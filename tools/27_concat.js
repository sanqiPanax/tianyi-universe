// 集锦拼接: 把多个片段裁切后按序 concat 成一个 mp3+mp4
// 用法: node 27_concat.js <id> '[{ep,start,end},...]'
// 每段从原片裁,按序拼,输出 clips/{id}.mp3/.mp4
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FF = 'F:/school_work/AIOT/dayao/ffmpeg-8.1-essentials_build/bin/ffmpeg.exe';
const SRC = 'F:/ownWork/天意宇宙/新三国';
const OUT = 'F:/ownWork/天意宇宙/clips';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'concat-'));

const id = process.argv[2];
const segs = JSON.parse(process.argv[3]);
console.log(`拼接 ${id}: ${segs.length} 段`);

// 1. 逐段裁无 pad 的 mp3/mp4
segs.forEach((s, i) => {
  const src = path.join(SRC, `新三国${String(s.ep).padStart(2, '0')}.mkv`);
  const b = path.join(TMP, `seg${i}`);
  execFileSync(FF, ['-v', 'error', '-y', '-ss', String(s.start), '-i', src,
    '-t', String(s.end - s.start), '-vn', '-acodec', 'libmp3lame', '-q:a', '5', b + '.mp3'],
    { stdio: 'ignore', timeout: 120000 });
  execFileSync(FF, ['-v', 'error', '-y', '-ss', String(s.start), '-i', src,
    '-t', String(s.end - s.start), '-c:v', 'libx264', '-crf', '26', '-preset', 'fast',
    '-c:a', 'aac', '-movflags', '+faststart', '-vf', 'scale=696:-2', b + '.mp4'],
    { stdio: 'ignore', timeout: 180000 });
  console.log(`  seg${i} ep${s.ep} ${s.start}-${s.end} ok`);
});

// 2. concat mp3 (mp3 直接 concat 需同参数;用 concat demuxer)
function concatFiles(ext) {
  const list = path.join(TMP, `list.${ext}`);
  fs.writeFileSync(list, segs.map((_, i) => `file '${path.join(TMP, `seg${i}`)}.${ext}'`).join('\n'));
  const outPath = path.join(OUT, `${id}.${ext}`);
  execFileSync(FF, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list,
    '-c', 'copy', outPath], { stdio: 'ignore', timeout: 120000 });
  return outPath;
}
concatFiles('mp3');
concatFiles('mp4');
console.log('DONE', id);
