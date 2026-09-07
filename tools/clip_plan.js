// 首批剪辑清单: 每个梗的 [nodeId, 集, 粗扫关键词, 精扫关键词, 描述]
// 定位流程: 粗扫全集(45s)→找命中窗口→精扫窗口(2s)→得精确时间→裁切
// 来源: 萌娘百科引用集数 + 爱奇艺分集剧情 交叉确认
module.exports = [
  { id: "cao-tan",       ep: 1,  coarse: "弹指,曹某",       fine: "弹指,首级",       desc: "弹指神通(王允寿宴)" },
  { id: "wangyun-jiri",  ep: 1,  coarse: "生日,忌日,老夫",  fine: "忌日",            desc: "今天不是生日而是忌日" },
  { id: "dongzhuo-suan", ep: 2,  coarse: "酸,不怕",          fine: "不怕酸",          desc: "咱家说了不怕酸" },
  { id: "panfeng",       ep: 5,  coarse: "潘凤,大斧,饥渴",   fine: "饥渴,大斧",       desc: "我的大斧饥渴难耐" },
  { id: "guanyu-bei",    ep: 5,  coarse: "华雄,温酒,关羽",   fine: "华雄",            desc: "杯酒斩华雄" },
  { id: "sunce-chengdi", ep: 6,  coarse: "玉玺,称帝,恭喜",   fine: "恭喜,称帝",       desc: "恭喜爹可以称帝了" },
  { id: "yuxi",          ep: 6,  coarse: "玉玺",             fine: "玉玺",            desc: "传国玉玺道具" },
  { id: "cao-ku",        ep: 11, coarse: "父亲,不孝,苍天",   fine: "不孝,父亲",       desc: "曹操哭爹" },
  { id: "xunyu-dao",     ep: 11, coarse: "道喜,悲伤",         fine: "道喜",            desc: "一者悲伤二者道喜" },
  { id: "cao-gai",       ep: 12, coarse: "兖州,不奇怪,偷袭", fine: "不奇怪,偷袭",     desc: "曹操盖饭" },
  { id: "cao-shagou",    ep: 47, coarse: "狗,骨头",           fine: "汪汪,狗",         desc: "曹操狗叫(二狗竞食)" },
];
