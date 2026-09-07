// 从现有粗扫索引(ep{N}.txt)里检索全部梗的关键词,输出命中表
// 用法: node 16_search.js
const fs = require('fs');
const path = require('path');

const RES = path.join(__dirname, 'coarse_results');
// 梗id -> 检索关键词列表(宽松,OCR容错用短词;命中一个即候选)
const QUOTES = {
  'wangyun-jiri': ['忌日', '生日'],
  'dongzhuo-suan': ['不怕酸', '怕酸', '肉酸'],
  'panfeng': ['大斧', '饥渴', '潘凤', '韩馥'],
  'guanyu-bei': ['华雄', '温酒', '杯酒', '关羽请战'],
  'sunce-chengdi': ['称帝', '玉玺', '恭喜'],
  'jiaobing': ['骄兵', '孙坚孤军', '败军'],
  'cao-shagou': ['狗', '汪汪', '骨头', '二狗'],
  'liubei-zijin': ['自刎', '归天', '列位弟兄'],
  'liubei-yuele': ['奏乐', '接着舞'],
  'liubei-erdi': ['二弟天下无敌', '天下无敌'],
  'guanyu-zhonger': ['帝王之征', '卧龙', '龙可是'],
  'guanyu-dazhan': ['换大盏', '大盏'],
  'guanyu-daduan': ['不斩老幼', '你太老了'],
  'sunquan-shizhu': ['你是主还是我是主', '江东到底', '姓孙还是姓周'],
  'sunquan-yi': ['议一下吧', '近乎恳求'],
  'zhangfei-kulong': ['透明窟窿', '捅他'],
  'zhangfei-sha': ['帅案', '掀'],
  'zhaoyun-zhuzi': ['撞死', '柱子'],
  'zhugeliang-bai': ['百分之百'],
  'zhugeliang-tianyi': ['天意所至', '想不胜都难'],
  'zhugeliang-huo': ['好火啊', '夷陵之火', '上方谷'],
  'liuchan': ['真的吗'],
  'lvmeng-heiyi': ['黑衣', '白衣', '渡江'],
  'luxun-shanliang': ['山梁', '夷陵山脉'],
  'sizhao': ['易水寒', '风萧萧'],
  'simayi-silun': ['四轮', '四轮儿车'],
  'simayi-momo': ['万万没有此事', '冤枉'],
  'simayi-bingwei': ['病危', '十几年'],
  'simayi-zhang': ['无恙否', '化骨'],
  'caoren-yige': ['留你一人', '一人坚守'],
  'caoren-qiao': ['配房', '大乔归我'],
  'liubei-lei': ['吓死', '雷'],
  'liubei-long': ['傲苍穹', '龙虎英雄'],
  'liubei-renyi': ['仁之剑', '义之剑'],
  'xingdaorong': ['说出吾名', '吓汝一跳', '零陵'],
  'chishenme': ['吃什么'],
  'yuanwen-liuzhu': ['列位诸公', '告老还乡'],
  'liusan': ['刘三刀', '三刀'],
  'wujiaosha': ['乌角鲨', '笑面虎'],
  'cao-xuzhou': ['原本就是我的', '我的我的'],
  'cao-buke': ['绝对不可能', '八万', '馒头'],
  'cao-ku': ['不孝啊', '父亲啊', '哭爹'],
  'chenggong-chongchong': ['蛐蛐', '有情有义'],
  'yuxi': ['玉玺'],
  'sunce-buxu': ['竟然不许'],
  'sunce-zhangma': ['战马', '损失'],
  'zhouyu-juelun': ['绝伦', '此曲'],
  'huanggai': ['小儿', '不服你'],
  'lushu-zuile': ['陶醉', '醉了'],
  'liubei-wangqing': ['活在马上', '活在梦里'],
  'cao-yisheng': ['医死', '医术'],
  'cao-erer': ['山不厌高', '短歌行', '厌高'],
  'cao-woai': ['我爱死他'],
  'cao-chunqiu': ['胡言乱语'],
  'cao-yiyoujiu': ['如饮美酒'],
  'xunyu': ['中原第一雄关', '雄关'],
  'guanyu-dafeng': ['刮骨', '三日内'],
};

const files = fs.readdirSync(RES).filter(f => /^ep\d+\.txt$/.test(f));
console.log('index files:', files.length);
const index = {}; // ep -> [{min, text}]
for (const f of files) {
  const ep = parseInt(f.match(/^ep(\d+)/)[1]);
  const lines = fs.readFileSync(path.join(RES, f), 'utf8').split('\n').map(l => l.replace(/\r$/, '')).filter(Boolean);
  const recs = [];
  for (const ln of lines) {
    const m = ln.match(/^\[(\d+):(\d+)\]\s*(.*)$/);
    if (m) recs.push({ min: parseInt(m[1]) * 60 + parseInt(m[2]), text: m[3] });
  }
  index[ep] = recs;
  console.log(`ep${ep}: ${recs.length} records`);
}

for (const [id, kws] of Object.entries(QUOTES)) {
  if (!kws.length) continue;
  const hits = [];
  for (const [ep, recs] of Object.entries(index)) {
    for (const kw of kws) {
      for (const r of recs) {
        if (r.text.includes(kw)) { hits.push({ ep: parseInt(ep), min: r.min, kw, text: r.text }); }
      }
    }
  }
  if (hits.length) {
    console.log(`\n### ${id} (${kws.join('/')})`);
    hits.slice(0, 5).forEach(h => console.log(`  ep${h.ep} ${Math.floor(h.min/60)}:${String(h.min%60).padStart(2,'0')} [${h.kw}] ${h.text.slice(0,50)}`));
  } else {
    console.log(`\n### ${id} — no hit in scanned eps`);
  }
}
