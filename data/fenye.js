/* ============================================================
   天意宇宙 · 二十八宿分野对应表
   ------------------------------------------------------------
   依据:中国古代「分野」体系 —— 把天上的二十八宿分给地上的州国。
        星次与州国的对应见《汉书·地理志》/《晋书·天文志》十二次分野。
        十二次与宿的归属是:寿星(角亢)=兖州 · 大火(氐房心)=豫州 ·
        析木(尾箕)=幽州 · 星纪(斗牛)=扬州 · 玄枵(女虚危)=青州 ·
        娵訾(室壁)=并州 · 降娄(奎娄胃)=徐州 · 大梁(昴毕)=冀州 ·
        实沈(觜参)=益州 · 鹑首(井鬼)=雍州 · 鹑火(柳星张)=三河 ·
        鹑尾(翼轸)=荆州。(合计 2+3+2+2+3+2+3+2+2+2+3+2 = 28 宿)

   ⚠️ 标注口径(不冒充文献依据):
      · 「进哪个州」= 有据可依的一层 —— 人物/事件在剧中的主要地域归属
      · 「州内进哪个宿」= 无独立文献依据,只是把这个州的梗按剧集时序摊到它的 2~3 个宿上
      · 中宫不入分野:天意机制类梗不属于二十八宿(二十八宿在紫微垣之外)

   ⚠️ 有意留空的宿:青州(女虚危)、并州(室壁)在本剧梗库里没有对应梗。
      不为了好看硬塞 —— 空着本身就是信息。
   ============================================================ */
window.DATA_FENYE = {
  meta: {
    system: "十二次分野(《汉书·地理志》系统)",
    note: "州依分野;宿为州内按剧集时序的分组;中宫(天意机制)不入二十八宿",
  },

  /* 十二次 → 州 → 宿(按周天顺序,与星图外圈刻度一致) */
  ci: [
    { id: "shouxing",  name: "寿星", zhou: "兖州", xiu: ["角", "亢"] },
    { id: "dahuo",     name: "大火", zhou: "豫州", xiu: ["氐", "房", "心"] },
    { id: "ximu",      name: "析木", zhou: "幽州", xiu: ["尾", "箕"] },
    { id: "xingji",    name: "星纪", zhou: "扬州", xiu: ["斗", "牛"] },
    { id: "xuanxiao",  name: "玄枵", zhou: "青州", xiu: ["女", "虚", "危"] },
    { id: "juzi",      name: "娵訾", zhou: "并州", xiu: ["室", "壁"] },
    { id: "jianglou",  name: "降娄", zhou: "徐州", xiu: ["奎", "娄", "胃"] },
    { id: "daliang",   name: "大梁", zhou: "冀州", xiu: ["昴", "毕"] },
    { id: "shenchen",  name: "实沈", zhou: "益州", xiu: ["觜", "参"] },
    { id: "chunshou",  name: "鹑首", zhou: "雍州", xiu: ["井", "鬼"] },
    { id: "chunhuo",   name: "鹑火", zhou: "三河", xiu: ["柳", "星", "张"] },
    { id: "chunwei",   name: "鹑尾", zhou: "荆州", xiu: ["翼", "轸"] },
  ],

  /* 州的一句话说明(给图例/档案卡用) */
  zhouDesc: {
    "兖州": "曹操起家之地 · 魏武集团",
    "豫州": "许都汉廷与魏国谋臣",
    "幽州": "公孙瓒与北疆",
    "扬州": "孙氏江东",
    "青州": "—(本剧梗库无对应)",
    "并州": "—(本剧梗库无对应)",
    "徐州": "吕布夺徐州 · 刘备早年",
    "冀州": "袁绍",
    "益州": "蜀汉 · 诸葛亮北伐",
    "雍州": "董卓与长安",
    "三河": "洛阳 · 陈留 · 中原腹地",
    "荆州": "关羽 · 刘表 · 荆襄",
  },

  /* 宿 → 该宿名下的梗 id(顺序 = 剧集时序) */
  xiu: {
    "角": ["cao-gai", "cao-buke", "cao-xuzhou", "cao-woai", "cao-yisheng", "cao-kancuo", "cao-erer", "cao-ku"],
    "亢": ["cao-tan", "cao-chunqiu", "cao-yiyoujiu", "cao-shagou", "cao-dazuo", "xunyu", "xunyu-dao"],
    "氐": ["liubei-lei", "liubei-long", "liubei-renyi", "liuxie"],
    "房": ["simayi-silun", "simayi-momo", "simayi-bingwei", "simayi-zhang", "sizhao"],
    "心": ["caoren-yige", "caoren-qiao"],
    "尾": ["liusan"],
    "箕": ["wujiaosha"],
    "斗": ["sunce-chengdi", "sunce-buxu", "sunce-tuogu", "sunce-zhangma",
           "liubei-yuele", "liubei-wuqin", "liubei-zalong", "liubei-wangqing"],
    "牛": ["sunquan-shizhu", "sunquan-yi", "zhouyu-juelun", "huanggai", "luxun-shanliang", "lushu-zuile"],
    "女": [],
    "虚": [],
    "危": [],
    "室": [],
    "壁": [],
    "奎": ["lubu-minggen", "shenchan"],
    "娄": ["chenggong-chongchong"],
    "胃": ["liubei-zijin", "sungan"],
    "昴": ["panfeng", "tianfeng"],
    "毕": ["yuanwen-liuzhu"],
    "觜": ["zhugeliang-bai", "zhugeliang-huo", "zhugeliang-tianyi", "liuchan"],
    "参": ["zhangfei-kulong", "zhangfei-sha", "liubei-yifu", "zhaoyun-zhuzi", "liubei-erdi", "baxigui"],
    "井": ["dongzhuo-suan"],
    "鬼": ["dongzhuo-yecao"],
    "柳": ["wangyun-jiri", "wangyun-shengsi"],
    "星": ["changle"],
    "张": ["yuxi", "chishenme"],
    "翼": ["guanyu-zhonger", "guanyu-bei", "guanyu-daduan", "guanyu-dazhan", "guanyu-dafeng", "guanyuzhige", "yuguanyu"],
    "轸": ["huangzhong-renjian", "xingdaorong", "lvmeng-heiyi"],
  },

  /* 中宫(紫微垣) —— 不入二十八宿 */
  center: ["tiyi", "jiaobing", "qieting", "chuansong", "yexing", "huoyan"],
};
