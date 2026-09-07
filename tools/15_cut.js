// 裁切工具: 按时间戳裁 mp3(语音) 和 mp4(可选视频)
// 用法: node 15_cut.js <json条目> 或读标准
// 条目: {id, ep, start, end, needVideo}
const { execFileSync } = require('child_process');
const path = require('path');

const FF = 'F:/school_work/AIOT/dayao/ffmpeg-8.1-essentials_build/bin/ffmpeg.exe';
const SRC = 'F:/ownWork/天意宇宙/新三国';
const OUT = 'F:/ownWork/天意宇宙/clips';

function cut(item) {
  const src = path.join(SRC, `新三国${String(item.ep).padStart(2, '0')}.mkv`);
  const base = path.join(OUT, item.id);
  const pad = 0.5; // 前后各留0.5s
  const ss = Math.max(0, item.start - pad);
  const dur = (item.end - item.start) + pad * 2;

  // 语音 mp3
  const argsMp3 = ['-v', 'error', '-y', '-ss', String(ss), '-i', src,
    '-t', String(dur), '-vn', '-acodec', 'libmp3lame', '-q:a', '5', base + '.mp3'];
  execFileSync(FF, argsMp3, { stdio: 'ignore', timeout: 120000 });
  console.log('mp3 ok', item.id);

  if (item.needVideo) {
    const argsMp4 = ['-v', 'error', '-y', '-ss', String(ss), '-i', src,
      '-t', String(dur), '-c:v', 'libx264', '-crf', '26', '-preset', 'fast',
      '-c:a', 'aac', '-movflags', '+faststart', '-vf', 'scale=696:-2', base + '.mp4'];
    execFileSync(FF, argsMp4, { stdio: 'ignore', timeout: 180000 });
    console.log('mp4 ok', item.id);
  }
}

const items = JSON.parse(process.argv[2]);
items.forEach(cut);
console.log('ALL DONE', items.length);
