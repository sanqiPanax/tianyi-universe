# -*- coding: utf-8 -*-
# 天意宇宙 · 梗雷达 (radar_scan.py)
# 半自动流水线 ①~⑥ 的第一步: 扫描 B站 新三国圈近期热门弹幕 → 候选新梗报告(md + json)
# 用法: python radar_scan.py [--days 30] [--top 14] [--max-seg 30] [--out report_YYYYMMDD]
# 防依赖: 只用 stdlib + protobuf(已装); 抓取带 sleep 限速防风控
import sys, io, os, re, json, time, argparse, datetime, collections

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from bili_api import Bili, strip_html
from whisper_index import WhisperIndex, fmt
from nodes_ref import load_nodes, check_dup, punc_clean

# ---------- 配置 ----------
KEYWORDS = ['新三国 吐槽', '扭三 吐槽', '新三国 名场面', '新三国 鬼畜', '新三国 台词', '新三国 盘点']
STOPWORDS = set('''哈哈哈哈 哈哈 笑死 笑死我了 笑死了 蚌埠住了 绷不住了 绷不住 泪目 爷青回 打卡 前排 已阅 收藏了 三连
一键三连 下次一定 好活 整挺好 awsl 666 233 我超 卧槽 我去 绝了 麻了 典 难绷 绷 名场面 前方高能 高能预警
泪奔 泪崩 破防了 破防 意难平 天花板 神仙剪辑 太强了 太牛了 牛逼 牛批 好家伙 天哪 救命 啊啊啊 哇塞
受不了 笑不活 笑喷 笑裂 每日一遍 常看常新 已三连 好耶 期待 太离谱 离谱 无语 我的天 艾玛 emm 呃
咱就是说 谁懂 谁懂啊 就是说 有没有一种可能 细思极恐 头皮发麻 鸡皮疙瘩 看哭了 看笑了 上头 上瘾 太上头
循环播放 无限循环 给我笑死 笑死我 笑不活了 绷不住了绷不住 太搞笑了 好搞笑 有意思 精彩 牛 强 顶 打卡打卡
厉害 经典 神作 绝绝子 绝了绝了 太顶了 我滴妈 妈耶 天呐 我去我去 我靠 靠 哈哈哈啊哈 笑死个人 大实话
开口就是大实话 说的好 说得好 有道理 太真实 真实 太对了 说对了 支持 好活当赏'''.split())
# 弹幕文本过短(<4字去标点) / 纯 emoji/数字 丢弃
DEDUP_MIN_CROSS = 2    # 跨≥2个视频才算
COUNT_MIN = 3          # 总出现次数≥
LEN_MIN, LEN_MAX = 4, 30
STOP_CN_CHARS = True

# ---------- 弹幕清洗 ----------
def norm_text(t):
    """去标点空白, 保中文+字母数字; 过短/停用词返回 ''"""
    c = punc_clean(t)
    if len(c) < LEN_MIN or len(c) > LEN_MAX: return ''
    if c in STOPWORDS: return ''
    # 重复叠字(啊/哈/笑)结尾削掉再判
    c2 = re.sub(r'[哈哈哈呵呵嘿嘿啊啊嗯嗯]+$', '', c)
    if len(c2) < LEN_MIN: return ''
    if c2 in STOPWORDS: return ''
    if re.fullmatch(r'[\d\W_]+', c2): return ''
    # 叠句折叠: "这就不奇怪了这就不奇怪了" → "这就不奇怪了"
    half = len(c2) // 2
    if len(c2) >= 8 and len(c2) % 2 == 0 and c2[:half] == c2[half:]:
        c2 = c2[:half]
    return c2

# ---------- 主流程 ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--days', type=int, default=30, help='近期窗口天数(视频发布日期过滤)')
    ap.add_argument('--top', type=int, default=14, help='抓取视频数上限')
    ap.add_argument('--max-seg', type=int, default=30, help='单视频最大弹幕分段数')
    ap.add_argument('--min-dm', type=int, default=5, help='近期新视频最低弹幕数才入选')
    ap.add_argument('--out', type=str, default='')
    ap.add_argument('--no-danmaku', action='store_true', help='只扫视频清单不抓弹幕(调试)')
    args = ap.parse_args()

    today = datetime.date.today()
    stamp = today.strftime('%Y%m%d')
    out_prefix = args.out or f'report_{stamp}'
    bili = Bili(delay=0.5)
    log = lambda *a: print(*a, flush=True)
    log('=== 天意宇宙 · 梗雷达 ===', datetime.datetime.now().strftime('%Y-%m-%d %H:%M'))

    # ---- ① 搜索信号层 ----
    log('[1/5] 搜索:', ', '.join(KEYWORDS))
    videos = {}
    for kw in KEYWORDS:
        try:
            for v in bili.search_videos(kw, pages=1):
                if not v.get('bvid'): continue
                videos[v['bvid']] = v   # 后到覆盖, 去重
        except Exception as e:
            log(f'  [搜索失败 {kw}] {repr(e)[:120]}')
        time.sleep(0.6)

    now_ts = time.time()
    for v in videos.values():
        v['age_d'] = (now_ts - v['pubdate']) / 86400 if v['pubdate'] else 999
    pool = list(videos.values())
    log(f'  去重后共 {len(pool)} 个视频')

    # 分层: 近期新内容(主体) + 头部常青(补充弹幕池)
    recent = [v for v in pool if v['age_d'] <= args.days and v['dm'] >= args.min_dm]
    legacy = [v for v in pool if v['age_d'] > args.days and v['dm'] >= 800]
    recent.sort(key=lambda v: (v['age_d'] < 14, -v['dm'], -v['play']))
    legacy.sort(key=lambda v: (-v['dm']))
    # 同一 UP 最多取 2 个, 避免内容同质化偏置
    picks, picked, up_count = [], set(), collections.Counter()
    max_per_up = 2
    for v in recent + legacy:
        if len(picks) >= args.top: break
        if v['bvid'] in picked: continue
        if up_count[v['author']] >= max_per_up: continue
        picked.add(v['bvid']); picks.append(v)
        up_count[v['author']] += 1
    log(f'[2/5] 选定 {len(picks)} 个视频抓弹幕(近30天新 {len(recent)} / 常青 {len(legacy)}, 每UP≤{max_per_up})')

    # ---- ② 弹幕抓取 ----
    vmeta, per_video = [], {}
    if not args.no_danmaku:
        for i, v in enumerate(picks, 1):
            try:
                info = bili.page_info(v['bvid'])
                if not info: continue
                dur = info['duration']
                max_seg = min(args.max_seg, max(1, int((dur + 179) / 180))) if dur else 6
                dm = bili.danmaku_all(info['cid'], dur, max_seg=max_seg)
                texts = [t for _, t in dm['items']]
                log(f'  [{i}/{len(picks)}] {v["author"]} | 弹幕{len(texts)}(截断{dm["truncated"]}) | {v["title"][:30]}')
                per_video[v['bvid']] = {'texts': texts, 'seg': dm['segs'], 'trunc': dm['truncated']}
                vmeta.append({'bvid': v['bvid'], 'title': v['title'], 'author': v['author'],
                              'play': v['play'], 'dm': v['dm'], 'age_d': round(v['age_d'], 1),
                              'url': f'https://www.bilibili.com/video/{v["bvid"]}',
                              'seg_fetched': dm['segs'], 'dm_fetched': len(texts)})
                time.sleep(0.4)
            except Exception as e:
                log(f'  [{i}] 失败 {v["title"][:24]}: {repr(e)[:100]}')
                continue

        # ---- ③ 候选提取: 同句跨视频复现 ----
        log('[3/5] 候选提取: 弹幕高频句 × 跨视频复现')
        # (normed_text) -> {vid: {raw:count, samples:[raw...]}}
        agg = collections.defaultdict(lambda: collections.defaultdict(list))
        for bvid, info in per_video.items():
            for raw in info['texts']:
                n = norm_text(raw)
                if not n: continue
                lst = agg[n][bvid]
                if len(lst) < 3 and raw not in lst: lst.append(raw)
        cands = []
        for n, byvid in agg.items():
            cross = len(byvid)
            total = sum(len(rs) for rs in byvid.values())
            # 短句(≤5字)碰巧重合概率高 → 必须跨≥3视频才算候选
            if len(n) <= 5:
                if cross < 3: continue
            elif cross < DEDUP_MIN_CROSS or total < COUNT_MIN:
                continue
            # 同视频刷屏为主的(单视频占比>80%)不算跨圈热度
            max_single = max(len(rs) for rs in byvid.values())
            if max_single / total > 0.85 and cross < 3: continue
            raw_s = sorted({r for rs in byvid.values() for r in rs})
            cands.append({'text': n, 'cross': cross, 'total': total,
                          'max_single': max_single,
                          'vids': sorted(byvid.keys()),
                          'sample_raw': raw_s[:5]})
        cands.sort(key=lambda c: (-c['cross'], -c['total']))
        log(f'  候选弹幕句 {len(cands)} 条(跨≥{DEDUP_MIN_CROSS}视频, 总≥{COUNT_MIN})')

        # ---- ④ 原句考证 + ⑤ 查重 ----
        log('[4/5] 原句考证(95集 whisper) + 查重(83节点)')
        idx = WhisperIndex()
        nodes = load_nodes()
        vid_title = {v['bvid']: v['title'] for v in vmeta}
        vid_author = {v['bvid']: v['author'] for v in vmeta}
        results = []
        for c in cands:
            hit = idx.verify_line(c['text'])
            dup, sim = check_dup(c['text'], nodes)
            eps_cnt, rows_cnt = (0, 0)
            if hit and hit['strong']:
                eps_cnt, rows_cnt = idx.occurrences(c['text'])
            # 泛用口语: 原片台词但全剧≥4集出现 → 不是独有名场面, 真梗概率低
            generic = hit is not None and hit['strong'] and eps_cnt >= 4
            vid_info = [(vid, vid_title.get(vid, '?')[:26], vid_author.get(vid, '')) for vid in c['vids'][:6]]
            results.append({
                **c,
                'verify': None if not hit else {'strong': hit['strong'], 'ep': hit['ep'],
                                                 'sec': hit['sec'], 'text': hit['text'], 'rate': hit['rate'],
                                                 'eps_cnt': eps_cnt, 'rows_cnt': rows_cnt},
                'generic': generic,
                'dup': None if not dup else {'id': dup['id'], 'name': dup['name'], 'sim': sim},
                'vids_detail': vid_info,
            })
        # 排序: 未入库且考证强命中非泛用 > 未入库未考证(二创疑云) > 未入库弱命中(可能截断句/评语) > 泛用 > 已入库(仅参考)
        def rank(r):
            if r['dup'] is None and r['verify'] and r['verify']['strong'] and not r['generic']: return 0
            if r['dup'] is None and not r['verify']: return 1
            if r['dup'] is None and r['verify'] and not r['verify']['strong']: return 2
            if r['dup'] is None and r['generic']: return 3
            return 4
        results.sort(key=lambda r: (rank(r), -r['cross'], -r['total']))
        log(f'[5/5] 完成: 候选 {len(results)} 条')

        # ---- 落盘 md 报告 ----
        out_md = os.path.join(HERE, out_prefix + '.md')
        out_json = os.path.join(HERE, out_prefix + '.json')
        write_report(out_md, results, vmeta, args, stamp)
        with open(out_json, 'w', encoding='utf-8') as f:
            json.dump({'date': stamp, 'videos': vmeta, 'candidates': results},
                      f, ensure_ascii=False, indent=1)
        log(f'报告: {out_md}')
        log(f'候选JSON: {out_json}')
    else:
        # 调试: 只列视频
        for v in picks:
            log(f'  {v["bvid"]} {v["author"]} dm{v["dm"]} play{v["play"]} {v["age_d"]:.0f}d {v["title"][:40]}')

# ---------- 报告渲染 ----------
def write_report(path, results, vmeta, args, stamp):
    L = []
    L.append('# 天意宇宙 · 梗雷达 《新三国圈 B站 候选新梗报告》')
    L.append('')
    L.append(f'> 扫描时间: 2026-09 (近 {args.days} 天发布内容为主) | 关键词: {" / ".join(KEYWORDS)}')
    L.append(f'> 视频池: {len(vmeta)} 个 | 弹幕候选 {len(results)} 条 | 阈值: 跨≥{DEDUP_MIN_CROSS}视频 总≥{COUNT_MIN}次')
    L.append(f'> 说明: ✅=原片考证强命中 ⚠️=弱命中 ❌=原片未检索到(疑似纯二创/空耳, **需人工核实再定夺**)')
    L.append(f'> 铁律: 机器只做脏活, 以下候选**不可自动入库**, 逐条人工确认后才可进 nodes.js')
    L.append('')
    groups = [
        ('🟢 A 组 · 疑似新梗(未入库 + 原句考证强命中 + 非泛用口语)', lambda r: r['dup'] is None and r['verify'] and r['verify']['strong'] and not r['generic']),
        ('🟠 A2 组 · 原片台词但全剧泛用(≥4集口语, 单点成梗概率低, 供参考)', lambda r: r['dup'] is None and r['generic']),
        ('🟡 B 组 · 疑似二创/新编(未入库 + 原片❌未考证到, **人工重点核查**)', lambda r: r['dup'] is None and not r['verify'] and not r['generic']),
        ('⚪ W 组 · 弱命中(可能是被截断的真台词, 也可能是观众评语巧合, 参考即可)', lambda r: r['dup'] is None and r['verify'] and not r['verify']['strong'] and not r['generic']),
        ('🔘 C 组 · 既有梗热度复现(已在库, 参考其近期活跃度)', lambda r: r['dup'] is not None),
    ]
    for title, pred in groups:
        g = [r for r in results if pred(r)]
        if not g: continue
        L.append(f'## {title} ({len(g)})')
        L.append('')
        L.append('| 候选句 | 跨视频 | 总次 | 原句考证 | 与库关系 | 出现视频 |')
        L.append('|---|---|---|---|---|---|')
        for r in g[:26]:
            if r['verify']:
                extra = f" 泛用{r['verify']['eps_cnt']}集" if r.get('generic') else ''
                vv = ('✅' if r['verify']['strong'] else '⚠️') + f" ep{r['verify']['ep']:02d}@{fmt(r['verify']['sec'])} rate{r['verify']['rate']}{extra}"
            else:
                vv = '❌ 未检索到'
            dup_txt = '—'
            if r['dup']:
                dup_txt = f"已在库: {r['dup']['name']} ({r['dup']['sim']})"
            vids_txt = '<br>'.join(f"{au}《{t}》" for _, t, au in r['vids_detail'][:3])
            L.append(f"| {r['text']} | {r['cross']} | {r['total']} | {vv} | {dup_txt} | {vids_txt} |")
        L.append('')
    # 视频清单附录
    L.append('## 📺 本次扫描的视频池')
    L.append('')
    L.append('| 作者 | 标题 | 播放 | 弹幕 | 距今天数 | 抓取弹幕 |')
    L.append('|---|---|---|---|---|---|')
    for v in vmeta:
        L.append(f"| {v['author']} | {v['title'][:34]} | {v['play']} | {v['dm']} | {v['age_d']:.0f}d | {v['dm_fetched']}(seg{v['seg_fetched']}) |")
    L.append('')
    L.append('---')
    L.append('*机器只做扫描与考证, 入库审美判断留给人。确认方法: 用 `node tools/25_whisper_search.js 关键词` 复核 + 看原片片段。*')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L))

if __name__ == '__main__':
    main()
