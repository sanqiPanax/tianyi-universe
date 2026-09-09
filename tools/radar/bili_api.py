# -*- coding: utf-8 -*-
# 天意宇宙 · 梗雷达 (bili_api.py)
# B站 API 封装: 搜索(wbi签名) → cid(pagelist) → 弹幕(seg.so protobuf)
# 沙箱约束: schannel 全挂, 一律走代理; 子进程输出禁接管道 → 模块内部不做 print 流水
import urllib.request, urllib.parse, http.cookiejar, hashlib, hmac, time, os, json, re
from google.protobuf.internal.decoder import _DecodeVarint32

PROXY = os.environ.get('RADAR_PROXY', 'http://127.0.0.1:7897')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
MIXIN_KEY_ENC_TAB = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52]

class Bili:
    def __init__(self, delay=0.45):
        self.cj = http.cookiejar.CookieJar()
        proxy = urllib.request.ProxyHandler({'http': PROXY, 'https': PROXY})
        self.opener = urllib.request.build_opener(proxy, urllib.request.HTTPCookieProcessor(self.cj))
        self.delay = delay

    def _get(self, url, referer='https://www.bilibili.com/', retry=2):
        for i in range(retry + 1):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': referer, 'Accept': '*/*'})
                with self.opener.open(req, timeout=25) as r:
                    return r.read()
            except Exception as e:
                if i == retry: raise
                time.sleep(1.2 * (i + 1))

    def warmup(self):
        """访问主页, 种下 buvid 会话 cookie"""
        self._get('https://www.bilibili.com/')
        return len(list(self.cj))

    def _wbi_key(self):
        body = json.loads(self._get('https://api.bilibili.com/x/web-interface/nav').decode())
        img = body['data']['wbi_img']['img_url'].rsplit('/', 1)[1].split('.')[0]
        sub = body['data']['wbi_img']['sub_url'].rsplit('/', 1)[1].split('.')[0]
        return img, sub

    def _enc_wbi(self, params, img_key, sub_key):
        mixin_key = (img_key + sub_key)[:32]
        params = dict(params); params['wts'] = int(time.time())
        params = {k: ''.join(c for c in str(v) if c not in "!'()*") for k, v in params.items()}
        q = urllib.parse.urlencode(sorted(params.items()))
        params['wbi_sign'] = hmac.new(mixin_key.encode(), q.encode(), hashlib.sha256).hexdigest()
        return params

    def search_videos(self, keyword, pages=1):
        """搜索视频, 返回 [{bvid, aid, title(去html), play, dm, author, pubdate}]
        -412 风控 → 退避重试(最长 3 次, 每次刷新 wbi key + 延长间隔)"""
        out = []
        for page in range(1, pages + 1):
            for attempt in range(3):
                try:
                    img, sub = self._wbi_key()
                    p = self._enc_wbi({'search_type': 'video', 'keyword': keyword, 'page': page}, img, sub)
                    url = 'https://api.bilibili.com/x/web-interface/search/type?' + urllib.parse.urlencode(p)
                    body = json.loads(self._get(url).decode())
                    if body.get('code') == 0:
                        for v in (body['data'].get('result') or []):
                            out.append({
                                'bvid': v.get('bvid'), 'aid': v.get('aid'),
                                'title': re.sub(r'<[^>]+>', '', v.get('title') or ''),
                                'play': v.get('play') or 0, 'dm': v.get('video_review') or 0,
                                'author': v.get('author'), 'pubdate': v.get('pubdate') or 0,
                                'duration_s': parse_dur(v.get('duration')) or 0,
                            })
                        break
                    time.sleep(3 + attempt * 3)
                except Exception:
                    time.sleep(3 + attempt * 3)
            time.sleep(self.delay)
        return out

    def page_info(self, bvid):
        """拿 cid + duration(秒). 老接口免 wbi"""
        body = json.loads(self._get(f'https://api.bilibili.com/x/player/pagelist?bvid={bvid}').decode())
        if body.get('code') != 0: return None
        p = body['data'][0]
        return {'cid': p['cid'], 'duration': p.get('duration') or 0, 'part': p.get('part')}

    def danmaku_seg(self, cid, seg_index):
        """抓一段弹幕 protobuf → [(progress_ms, text)]"""
        url = f'https://api.bilibili.com/x/v2/dm/web/seg.so?type=1&oid={cid}&segment_index={seg_index}'
        raw = self._get(url)
        if not raw or len(raw) < 8: return None
        els = _decode_elems(raw)
        if not els: return None
        return [(e.get(2, 0), e[7].decode('utf-8', 'replace')) for e in els if 7 in e]

    def danmaku_all(self, cid, duration_s, max_seg=30, quiet=True):
        """抓全弹幕(分段数=ceil(dur/180s), 封顶 max_seg 段防风控)
        返回 {items: [(progress_ms,text)], segs: n, truncated: bool}"""
        n_seg = max(1, int((duration_s + 179) / 180)) if duration_s else 1
        truncated = n_seg > max_seg
        n_seg = min(n_seg, max_seg)
        items, got = [], 0
        for i in range(1, n_seg + 1):
            try:
                seg = self.danmaku_seg(cid, i)
            except Exception:
                break
            if seg is None:
                if i > 1 and got == 0: break
                break
            items.extend(seg); got += len(seg)
            time.sleep(self.delay)
        return {'items': items, 'segs': n_seg, 'truncated': truncated}

# ---------- protobuf 轻量解码 (DanmakuElem: 1=id, 2=progress, 7=content, 8=ctime) ----------
def _decode_elems(data):
    elems, pos, n = [], 0, len(data)
    while pos < n:
        tag, pos = _DecodeVarint32(data, pos)
        field, wire = tag >> 3, tag & 7
        if field == 1 and wire == 2:
            ln, pos = _DecodeVarint32(data, pos)
            sub = data[pos:pos+ln]; pos += ln
            elems.append(_decode_elem(sub))
        elif wire == 0:
            _, pos = _DecodeVarint32(data, pos)
        elif wire == 1: pos += 8
        elif wire == 2:
            ln, pos = _DecodeVarint32(data, pos); pos += ln
        elif wire == 5: pos += 4
        else: break
    return elems

def _decode_elem(data):
    e, pos, n = {}, 0, len(data)
    while pos < n:
        tag, pos = _DecodeVarint32(data, pos)
        field, wire = tag >> 3, tag & 7
        if wire == 0:
            v, pos = _DecodeVarint32(data, pos); e[field] = v
        elif wire == 2:
            ln, pos = _DecodeVarint32(data, pos)
            e[field] = data[pos:pos+ln]; pos += ln
        elif wire == 1: e[field] = data[pos:pos+8]; pos += 8
        elif wire == 5: e[field] = data[pos:pos+4]; pos += 4
        else: break
    return e

def parse_dur(s):
    """'MM:SS' 或 'H:MM:SS' → 秒"""
    if not s: return None
    parts = str(s).split(':')
    try:
        if len(parts) == 2: return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 3: return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except Exception:
        return None
    return None

def strip_html(s):
    return re.sub(r'<[^>]+>', '', s or '')
