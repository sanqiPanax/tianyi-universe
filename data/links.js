// 天意宇宙 · 连线数据(种子版)
// 字段: id, source, target(节点id), kind(线型), note(天意小纸条:点击连线弹出的解释)
// kind: 回旋镖hui | 互文hu | 天意修正xiu | 兼用卡jian | 演员联动yan | 原著对比yuan | 权谋因果quan | 二创回授er
window.DATA_LINKS = [
  // ---------- 机制-机制(宇宙骨架) ----------
  { id:"l-tiyi-jb", source:"tiyi", target:"jiaobing", kind:"quan", note:"天意给新三实装了ELO:骄兵必败,败兵必哀,哀兵必胜——一切胜负皆天意调度。" },
  { id:"l-tiyi-qt", source:"tiyi", target:"qieting", kind:"quan", note:"天意让'二人密谋'必被窃听,以保证权谋戏能推进。" },
  { id:"l-tiyi-cs", source:"tiyi", target:"chuansong", kind:"quan", note:"天意在路上开了传送门,所以大军能瞬移。" },
  { id:"l-tiyi-yx", source:"tiyi", target:"yexing", kind:"quan", note:"中立伏兵是天意召唤的野怪,连孙坚都中过它的招。" },
  { id:"l-tiyi-hy", source:"tiyi", target:"huoyan", kind:"quan", note:"火焰流星雨是天意发的战争外挂,自带敌我识别。" },

  // ---------- 曹操回旋镖集团 ----------
  { id:"l-bknq-cg", source:"cao-gai", target:"cao-buke", kind:"hui", note:"同为曹操'破防三连'成员:盖饭、徐州我的、八万馒头,全在丢地盘时发作。" },
  { id:"l-cg-xz", source:"cao-gai", target:"cao-xuzhou", kind:"hui", note:"兖州被偷→盖饭;徐州被骗→'我的我的'。同一集连续破防。" },
  { id:"l-bknq-xz", source:"cao-buke", target:"cao-xuzhou", kind:"hui", note:"'徐州原本就是我的'和'绝对不可能'说的是同一件事:徐州丢了。" },
  { id:"l-woai-sx", source:"cao-woai", target:"cao-xuzhou", kind:"hui", note:"曹操在徐州见过赵云,长坂坡又'我爱死他了'——天意让他失忆。" },
  { id:"l-yisheng-fn", source:"cao-yisheng", target:"cao-erer", kind:"hui", note:"赤壁战败复盘讲歪理、阵前念诗断句崩——曹操的'文艺破防'两面。" },
  { id:"l-fennu", source:"cao-buke", target:"cao-gai", kind:"hui", note:"曹操刚教儿子'不要愤怒,愤怒会降低你的智慧',自己转头就是破防三连。" },
  { id:"l-chunqiu-erer", source:"cao-chunqiu", target:"cao-erer", kind:"yuan", note:"一边'春秋胡言乱语',一边'二言绝句'念短歌行——新三曹操没文化人设闭环。" },
  { id:"l-kancuo-chong", source:"cao-kancuo", target:"chenggong-chongchong", kind:"quan", note:"同一场(杀吕伯奢后):陈宫想蛐蛐,曹操'我从不怕别人看错我'——三观崩坏现场。" },

  // ---------- 荀彧线(爹死喜剧) ----------
  { id:"l-ku-yiyoujiu", source:"cao-ku", target:"cao-yiyoujiu", kind:"quan", note:"爹死了→荀彧道喜→曹操'听你讲话如饮美酒'——孝道崩坏的完整链条。" },
  { id:"l-ku-daoxi", source:"cao-ku", target:"xunyu-dao", kind:"quan", note:"曹操哭爹(假),荀彧道喜(真),父死子笑臣也笑。" },
  { id:"l-yiyoujiu-dx", source:"cao-yiyoujiu", target:"xunyu-dao", kind:"quan", note:"荀彧先'道喜'再被夸'如饮美酒',一套连招把丧事办成喜事。" },
  { id:"l-xunyu-shagou", source:"cao-shagou", target:"xunyu", kind:"quan", note:"荀彧满嘴狗计(二狗竞食/以狼搏狗),曹操则直接学狗叫。" },

  // ---------- 司马懿线 ----------
  { id:"l-sima-4l", source:"simayi-silun", target:"simayi-momo", kind:"hui", note:"司马懿被天意整得一会惦记四轮车,一会满地打滚喊冤。" },
  { id:"l-bingwei-momo", source:"simayi-bingwei", target:"simayi-momo", kind:"hui", note:"'万万没有此事'的癫,和'病危十几年'的癫,是同一套表演体系。" },
  { id:"l-zhang-fennu", source:"simayi-zhang", target:"sizhao", kind:"quan", note:"司马懿打儿子(曹丕/司马昭)与'化骨绵掌'拍曹真,一家子暴力狂。" },

  // ---------- 刘备自刎/魂锁三兄弟 ----------
  { id:"l-zijin", source:"liubei-zijin", target:"guanyu-daduan", kind:"hu", note:"刘备'自刎归天',关羽'自尽便是懦夫'——蜀汉人均自毁倾向(灵魂锁链)。" },
  { id:"l-zijin-guanyu", source:"guanyu-daduan", target:"liubei-zijin", kind:"hui", note:"关羽麦城一边说'自尽便是懦夫'一边捋须自刎,回旋镖打自己。" },
  { id:"l-daduan-huang", source:"guanyu-daduan", target:"huangzhong-renjian", kind:"quan", note:"战长沙双雄互放水:'大刀不斩老幼'对'人间没有第二个黄忠'——新三版惺惺相惜。" },
  { id:"l-zhonger-long", source:"liubei-long", target:"guanyu-zhonger", kind:"hu", note:"大哥写'龙虎英雄傲苍穹',二弟搞'龙是帝王之征'文字狱——卧龙真是龙。" },
  { id:"l-lei-renyi", source:"liubei-lei", target:"liubei-renyi", kind:"quan", note:"青梅煮酒一场戏贡献'龙虎傲苍穹''仁之剑义之剑''这雷把我吓死'三连梗。" },
  { id:"l-lei-long", source:"liubei-lei", target:"guanyu-zhonger", kind:"hu", note:"'这雷把我吓死了'与'龙是帝王之征'常被网友接龙玩(扎聋耳朵梗)。" },
  { id:"l-zalong-zhonger", source:"liubei-zalong", target:"guanyu-zhonger", kind:"hui", note:"关羽刚说'龙可是帝王之征',刘备就'再议论孔明我扎聋耳朵'——同一场戏,聋/龙谐音闭环。网友接龙:'聋?龙可是帝王之征啊!'" },
  { id:"l-zj-yuele", source:"liubei-zijin", target:"liubei-yuele", kind:"hui", note:"刘备的两种摆烂:战败想自刎,得意就奏乐跳舞。" },
  { id:"l-wuqin-yuele", source:"liubei-wuqin", target:"liubei-yuele", kind:"quan", note:"洞房舞剑'无情剑'→东吴享乐'接着奏乐接着舞':刘备在东吴的荒唐两连。" },
  { id:"l-yifu-wuqin", source:"liubei-yifu", target:"liubei-wuqin", kind:"hui", note:"刘备'妻子如衣服兄弟如手足'→对孙小妹洞房'相敬如宾'——东吴这段把刘备对婚姻的态度演得前后打脸。" },

  // ---------- 关羽线 ----------
  { id:"l-bei-wenjiu", source:"guanyu-bei", target:"panfeng", kind:"yuan", note:"温酒斩华雄变杯酒——和潘凤'大斧饥渴难耐'同场,华雄专杀吹牛者。" },
  { id:"l-huaxiong", source:"guanyu-bei", target:"liusan", kind:"yuan", note:"刘三刀潘凤连送,关羽'杯酒斩华雄'收尾——讨董吹牛流水线。" },
  { id:"l-guanyu-dazhan-guanyu", source:"guanyu-dazhan", target:"guanyu-daduan", kind:"hui", note:"关大盏'换大盏'与'大刀不斩老幼'都是关羽装逼+喝酒一体两面。" },

  // ---------- 张飞/掀桌喜剧 ----------
  { id:"l-zhangfei-kulong-sha", source:"zhangfei-kulong", target:"zhangfei-sha", kind:"hui", note:"张飞口嗨捅窟窿、动手掀帅案——新三把他写成纯恶霸(张狒狒)。" },

  // ---------- 赵云/诸葛亮 ----------
  { id:"l-zhaoyun-zz", source:"zhaoyun-zhuzi", target:"cao-woai", kind:"hu", note:"赵云'一头撞死柱子上'的烈,曹操'我爱死他了'的痴——全剧都爱赵云。" },
  { id:"l-zgl-bai", source:"zhugeliang-bai", target:"zhugeliang-tianyi", kind:"quan", note:"'百分之百可信'的现代感与'天意所至'的躺平感,都是孔明被天意上身。" },
  { id:"l-zgl-huo", source:"zhugeliang-huo", target:"liubei-zijin", kind:"yuan", note:"孔明夸'比夷陵之火还好',刘备一听就血压高——君臣裂痕。" },

  // ---------- 东吴线 ----------
  { id:"l-yuxi-sunce", source:"sunce-chengdi", target:"yuxi", kind:"quan", note:"玉玺(蛋糕)一到手,孙坚孙策就变反贼——玉玺是心灵控制道具。" },
  { id:"l-sunquan-shi", source:"sunquan-shizhu", target:"zhouyu-juelun", kind:"quan", note:"孙权为当'江东之主'打压周瑜;周瑜忙着'此曲绝伦'谈恋爱——东吴权谋喜剧。" },
  { id:"l-lv-bai", source:"lvmeng-heiyi", target:"guanyu-daduan", kind:"yuan", note:"吕蒙'黑衣渡江'偷荆州 vs 关羽'大刀不斩老幼'装逼——大意失荆州。" },
  { id:"l-yi-diao", source:"sunquan-yi", target:"sizhao", kind:"hu", note:"孙权'议一下吧'与上方谷'唱易水歌'——都是被R9剪出灵魂的'转场神句'。" },

  // ---------- 群像 ----------
  { id:"l-wangyun", source:"wangyun-shengsi", target:"wangyun-jiri", kind:"hui", note:"王允系:半场开香槟说'生死不明就是死了',寿宴开场说'今天是我忌日'。" },
  { id:"l-dz-ck", source:"dongzhuo-suan", target:"shenchan", kind:"quan", note:"董卓'咱家不怕酸'与吕布貂蝉'凤凰涅槃'——西凉组魔幻现实主义。" },
  { id:"l-chong", source:"chenggong-chongchong", target:"cao-gai", kind:"hui", note:"陈宫想蛐蛐、曹操哭爹假哭——都'无情'到极致,所以能互文。" },
  { id:"l-xiaohu", source:"wujiaosha", target:"liusan", kind:"quan", note:"公孙瓒一人贡献两大离谱台词:乌角鲨+刘三刀。" },
  { id:"l-bishi", source:"panfeng", target:"xingdaorong", kind:"hu", note:"潘凤邢道荣并称'吹牛即死'双雄;三国杀都做进武将台词。" },
  { id:"l-liuxie-ke", source:"liuxie", target:"dongzhuo-suan", kind:"yuan", note:"献帝夸曹操'比董卓英雄十倍'——但新三董卓像个'正常人'。" },
  { id:"l-yecao-suan", source:"dongzhuo-yecao", target:"dongzhuo-suan", kind:"hui", note:"董卓前脚对天子诉苦'命比黄连苦',后脚朝堂'咱家不怕酸'——卖惨与凶残一体两面。" },

  // ---------- 服化道/演员 ----------
  { id:"l-changle", source:"changle", target:"cao-ku", kind:"jian", note:"哭爹的宫殿镜头与上朝是同一栋'长乐宫'——兼用卡之王。" },
  { id:"l-guanyuzhige", source:"guanyuzhige", target:"guanyu-dazhan", kind:"jian", note:"关羽之歌响起时关羽未必在场;关大盏单刀赴会也靠它撑场。" },
  { id:"l-sungan-yuguanyu", source:"sungan", target:"yuguanyu", kind:"yan", note:"杨瑞=文关羽替身,张胜阳=武关羽替身——关羽一半是孙乾周仓演的。" },
  { id:"l-sungan-guanyu", source:"sungan", target:"guanyu-bei", kind:"yan", note:"你看到的'杯酒斩华雄'里的关羽,可能正是孙乾本乾(杨瑞)在演。" },
  { id:"l-yuguanyu-dazuo", source:"yuguanyu", target:"cao-dazuo", kind:"yan", note:"演员梗聚会:于荣光演关羽全靠替身,陈建斌演曹操不会骑马。" },
  { id:"l-yuxi-sunce2", source:"yuxi", target:"sunce-chengdi", kind:"quan", note:"玉玺大到像蛋糕,孙策才喊得出'恭喜爹可以称帝'——道具成就名场面。" },
  { id:"l-tuogu-chengdi", source:"sunce-tuogu", target:"sunce-chengdi", kind:"hui", note:"孙策从'恭喜爹称帝'的疯小子到'举贤任能我不如你'的临终清醒——天意让他把玉玺的祸走完。" },
  { id:"l-bagui", source:"baxigui", target:"zhugeliang-huo", kind:"quan", note:"巴西龟占卜求孔明,火烧上方谷求雨失败——天意不认巴西龟。" },

  // ---------- 天意修正(逻辑死锁被天意圆回原著) ----------
  { id:"l-xiu-bowang", source:"zhugeliang-huo", target:"tiyi", kind:"xiu", note:"博望坡火攻计划根本没人点火(逻辑死锁),但天意一出手,蜀军就是赢了。" },
  { id:"l-xiu-maidi", source:"guanyu-bei", target:"tiyi", kind:"xiu", note:"过五关斩六将删成三关四将,蔡阳却仍说关羽斩了秦琪——天意把砍掉的剧情圆了回来。" },

  // ---------- 二创回授(星图上标★) ----------
  { id:"l-r9-yi", source:"sunquan-yi", target:"tiyi", kind:"er", note:"'议一下吧'原片平平,被R9剪成万能转场才封神——二创回授天意。" },
  { id:"l-r9-4l", source:"simayi-silun", target:"tiyi", kind:"er", note:"'四轮儿车'的魔性来自R9反复使用,天意盖章。" },
  { id:"l-r9-qieting", source:"qieting", target:"tiyi", kind:"er", note:"'窃听定律'由折棒总结,R9发扬——机制梗也是二创产物。" },
  { id:"l-r9-sungan", source:"sungan", target:"tiyi", kind:"er", note:"'百变孙乾'靠二创盘点出圈,本体只是敬业龙套。" },
];
