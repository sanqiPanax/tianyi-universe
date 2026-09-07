// 天意宇宙 · 数据健康报告生成器
// 从 nodes/links/clips 自动生成: 势力统计 / 已剪清单 / 缺口 / 孤儿坏链 / README 同步用表格
// 用法: node report.js            -> 打印报告
//       node report.js --md       -> 输出可粘贴进 README 的清单(势力分组)
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

const { DATA_NODES: nodes, DATA_LINKS: links, DATA_CLIPS: clips } = {
  DATA_NODES: load('data/nodes.js').DATA_NODES,
  DATA_LINKS: load('data/links.js').DATA_LINKS,
  DATA_CLIPS: load('data/clips.js').DATA_CLIPS,
};

const FACTION_CN = { wei: '曹魏系', shu: '蜀汉系', wu: '东吴系', qun: '群像', jizhi: '机制', zahu: '杂项' };
const ids = new Set(nodes.map(n => n.id));
const byFaction = {};
for (const n of nodes) if (clips[n.id]) (byFaction[n.faction] = byFaction[n.faction] || []).push(n);

const report = { generated: new Date().toISOString().slice(0, 10) };
report.nodes = nodes.length;
report.links = links.length;
report.clipIds = Object.keys(clips).length;
report.playable = nodes.filter(n => clips[n.id]).length;
report.badLinks = links.filter(l => !ids.has(l.source) || !ids.has(l.target));
report.orphanClips = Object.keys(clips).filter(id => !ids.has(id));
report.missing = nodes.filter(n => !clips[n.id]).sort((a, b) => b.pop - a.pop);
report.noCut = nodes.filter(n => !clips[n.id] && n.noCut);           // 展示型不剪(全剧现象/二创)
report.toCut = nodes.filter(n => !clips[n.id] && !n.noCut);          // 真正待剪缺口
report.byFaction = Object.fromEntries(Object.entries(byFaction).map(([k, v]) => [k, v.length]));
report.mp3Only = Object.entries(clips).filter(([, v]) => v.mp3 && !v.mp4).map(([id]) => id);
report.mp4Only = Object.entries(clips).filter(([, v]) => !v.mp3 && v.mp4).map(([id]) => id);

// 势力分组清单(md 表格一行一势力)
function factionListMd() {
  const lines = [];
  for (const [fk, arr] of Object.entries(byFaction)) {
    const cn = FACTION_CN[fk] || fk;
    const names = arr.map(n => `${n.name}(${n.ep})`).join('·');
    lines.push(`| ${cn} | ${arr.length} | ${names} |`);
  }
  return lines.join('\n');
}

if (process.argv.includes('--md')) {
  console.log(factionListMd());
  process.exit(0);
}

console.log('=== 天意宇宙 数据健康报告 ===');
console.log(`节点 ${report.nodes} | 连线 ${report.links} | clip id ${report.clipIds} | 可播 ${report.playable}`);
console.log(`势力分布:`, JSON.stringify(report.byFaction));
console.log(`\n坏链(${report.badLinks.length}):`, report.badLinks.map(l => `${l.source}→${l.target}`).join(', ') || '无');
console.log(`孤儿clip(${report.orphanClips.length}):`, report.orphanClips.join(', ') || '无');
console.log(`缺mp4(${report.mp3Only.length}):`, report.mp3Only.join(', ') || '无');
console.log(`缺mp3(${report.mp4Only.length}):`, report.mp4Only.join(', ') || '无');
console.log(`\n展示型不剪(${report.noCut.length},noCut标注):`);
for (const n of report.noCut) console.log(`  ${n.id} | ${n.name} | ${n.noCut}`);
console.log(`\n真正待剪缺口(${report.toCut.length}):`);
for (const n of report.toCut) console.log(`  ${n.id} | ${n.name} | pop${n.pop} | ${n.ep || ''}`);
if(!report.toCut.length) console.log('  (无——所有无素材节点均已标注 noCut)');
console.log(`\n--- 势力清单(md,可用 --md 输出) ---`);
console.log(factionListMd());
