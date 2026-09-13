/* ============================================================
   天意宇宙 · 交互与动效层
   渲染:D3 v7 力导向 + SVG;星空:Canvas 视差
   核心交互:镜头语言 / 涟漪传播 / 光点流动 / 播片模式(录屏用)
   ============================================================ */
(() => {
"use strict";

/* ---------- 数据 ---------- */
const NODES = window.DATA_NODES || [];
const LINKS = window.DATA_LINKS || [];
const CLIPS = window.DATA_CLIPS || {};
const SCRIPT = window.DATA_SCRIPT || {};
const SCRIPT_EPS = Object.keys(SCRIPT).sort();
const ONLINE = /^https?:$/.test(location.protocol);

/* ---------- 配色:矿物颜料 ---------- */
const FCOLOR = {
  wei:  "#c9a227",  // 藤黄 — 魏·中宫
  shu:  "#c0392b",  // 朱砂 — 蜀·汉室
  wu:   "#2f7d8f",  // 石青 — 吴·四方
  qun:  "#7c5aa8",  // 紫草 — 群像·列宿
  jizhi:"#d8dee9",  // 月白 — 天意·客星
  zahu: "#6b6156",  // 苍墨 — 服化道·荧惑
  cast: "#d98a3d",  // 赭石 — 演员·杂星
};
/* 借古星官分组(表意,非史实对应) */
const YUAN = {
  wei:"紫微垣", shu:"太微垣", wu:"天市垣",
  qun:"二十八宿", jizhi:"客星", zahu:"荧惑", cast:"杂星",
};
const TYPE_NAME = { quote:"台词梗", scene:"名场面", mech:"天意机制", prop:"服化道/拍摄", cast:"演员/幕后" };

const KCOLOR = {
  hui:"#d24b3a", hu:"#d99a3d", xiu:"#b9c7d6", jian:"#2f7d8f",
  yan:"#9b6fc4", yuan:"#c9a227", quan:"#4f9b7a", er:"#c96f9b",
};
const KNAME = { hui:"回旋镖", hu:"互文", xiu:"天意修正", jian:"兼用卡", yan:"演员联动", yuan:"原著对比", quan:"权谋因果", er:"二创回授" };
/* 线型 dash:让八种关系在灰度下也能区分 */
const KDASH = {
  hui:null, hu:"7 4", xiu:"2 5", jian:"12 5", yan:"1 4", yuan:"5 3 1 3", quan:"9 4", er:"3 3",
};

const CORE_ID = "tiyi";          // 真实节点「天意侵蚀」即中宫
const isCore = d => d && d.id === CORE_ID;

/* ============================================================
   一、星空背景(三层视差 + 平滑呼吸 + 流星)
   ============================================================ */
const starCanvas = document.getElementById("starfield");
const sctx = starCanvas.getContext("2d");
let layers = [], meteors = [], nextMeteor = 3000;

function buildStars(){
  starCanvas.width = innerWidth;
  starCanvas.height = innerHeight;
  const area = innerWidth * innerHeight;
  const spec = [
    { n: Math.min(220, area / 9000), rMin: .35, rMax: .8,  aMin: .18, aMax: .45, par: .05, warm: 0 },
    { n: Math.min(120, area / 17000), rMin: .6,  rMax: 1.25, aMin: .35, aMax: .75, par: .14, warm: .28 },
    { n: Math.min(46,  area / 42000), rMin: 1.0,  rMax: 1.9,  aMin: .55, aMax: 1,   par: .3,  warm: .5 },
  ];
  layers = spec.map(s => ({
    par: s.par,
    pts: Array.from({ length: Math.max(12, Math.round(s.n)) }, () => {
      const warm = Math.random() < s.warm;
      return {
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        r: s.rMin + Math.random() * (s.rMax - s.rMin),
        a: s.aMin + Math.random() * (s.aMax - s.aMin),
        ph: Math.random() * Math.PI * 2,
        sp: .3 + Math.random() * .7,
        col: warm ? "#e8cf94" : "#cfe0ff",
      };
    }),
  }));
}
buildStars();
addEventListener("resize", buildStars);

function drawStars(now) {
  const W = innerWidth, H = innerHeight;
  sctx.clearRect(0, 0, W, H);
  // 注:星云底不在这里画 —— 每帧全屏径向渐变填色实测把帧耗时从 4ms 推到 13ms,
  // 已改由 CSS 合成层 #nebula 承担(见 tianyi.css)。
  for (const L of layers) {
    const ox = camPan.x * L.par, oy = camPan.y * L.par;
    for (const s of L.pts) {
      const tw = .62 + Math.sin(now * .0011 * s.sp + s.ph) * .38;
      let x = s.x + ox, y = s.y + oy;
      x = ((x % W) + W) % W; y = ((y % H) + H) % H;
      sctx.globalAlpha = s.a * tw;
      sctx.fillStyle = s.col;
      sctx.beginPath();
      sctx.arc(x, y, s.r, 0, 6.2832);
      sctx.fill();
    }
  }
  // 流星(渐变在生成时缓存一次,不在每帧新建)
  sctx.globalAlpha = 1;
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    if (m.t >= m.dur) { meteors.splice(i, 1); continue; }
    m.t += m.dt;                       // 由主循环推进
    const x = m.x + m.vx * m.t, y = m.y + m.vy * m.t;
    sctx.strokeStyle = m.grad; sctx.lineWidth = 1.4; sctx.lineCap = "round";
    // 渐变的坐标固定,靠 translate 跟随流星(避免每帧重建 gradient 对象)
    sctx.save();
    sctx.translate(x, y);
    sctx.beginPath(); sctx.moveTo(0, 0); sctx.lineTo(-m.vx * .12, -m.vy * .12); sctx.stroke();
    sctx.restore();
  }
  sctx.globalAlpha = 1;
}
function spawnMeteor() {
  const x = innerWidth * (.15 + Math.random() * .7), y = -30;
  const ang = Math.PI * (.28 + Math.random() * .18), sp = .55 + Math.random() * .35;
  const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
  const grad = sctx.createLinearGradient(0, 0, -vx * .12, -vy * .12);
  grad.addColorStop(0, "rgba(255,240,200,.95)");
  grad.addColorStop(1, "rgba(255,240,200,0)");
  meteors.push({ x, y, t: 0, dt: 16, dur: 1400 + Math.random() * 900, vx, vy, grad });
}

/* ============================================================
   二、SVG 与图层
   ============================================================ */
const svgRoot = d3.select("#graph").append("svg")
  .attr("width", "100%").attr("height", "100%").attr("data-z", "mid");
const defs = svgRoot.append("defs");
const gWorld  = svgRoot.append("g");
const gDecor  = gWorld.append("g").attr("pointer-events", "none");
const gGlow   = gWorld.append("g").attr("pointer-events", "none");  // 星体辉光单独一层,压在连线之下
const gLink   = gWorld.append("g");
const gFlow   = gWorld.append("g").attr("pointer-events", "none");
const gNode   = gWorld.append("g");
const gRipple = gWorld.append("g").attr("pointer-events", "none");
/* 装饰与辉光层要跟着力导向的中心走,否则同心圆会偏出画面 */
function recenter() {
  gDecor.attr("transform", `translate(${innerWidth / 2},${innerHeight / 2})`);
}
recenter();

// 每个势力的星体辉光渐变
for (const f in FCOLOR) {
  const g = defs.append("radialGradient").attr("id", "glow-" + f);
  g.append("stop").attr("offset", "0%").attr("stop-color", FCOLOR[f]).attr("stop-opacity", .72);
  g.append("stop").attr("offset", "40%").attr("stop-color", FCOLOR[f]).attr("stop-opacity", .24);
  g.append("stop").attr("offset", "100%").attr("stop-color", FCOLOR[f]).attr("stop-opacity", 0);
}
// 星体立体渐变(中心亮、边缘暗,像一点发光体)
for (const f in FCOLOR) {
  const g = defs.append("radialGradient").attr("id", "body-" + f)
    .attr("cx", "36%").attr("cy", "32%").attr("r", "72%");
  g.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff").attr("stop-opacity", .85);
  g.append("stop").attr("offset", "26%").attr("stop-color", FCOLOR[f]).attr("stop-opacity", 1);
  g.append("stop").attr("offset", "100%").attr("stop-color", FCOLOR[f]).attr("stop-opacity", .62);
}
// 中宫本体:黑盘 + 金边(黑洞/帝星的观感)
const coreBody = defs.append("radialGradient").attr("id", "coreBody")
  .attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
coreBody.append("stop").attr("offset", "0%").attr("stop-color", "#04050a").attr("stop-opacity", 1);
coreBody.append("stop").attr("offset", "52%").attr("stop-color", "#0c0a06").attr("stop-opacity", 1);
coreBody.append("stop").attr("offset", "76%").attr("stop-color", "#8a6d1c").attr("stop-opacity", .92);
coreBody.append("stop").attr("offset", "90%").attr("stop-color", "#efd79a").attr("stop-opacity", 1);
coreBody.append("stop").attr("offset", "100%").attr("stop-color", "#c9a227").attr("stop-opacity", .3);
// 中宫吸积盘
const diskGrad = defs.append("radialGradient").attr("id", "disk");
diskGrad.append("stop").attr("offset", "0%").attr("stop-color", "#c9a227").attr("stop-opacity", .5);
diskGrad.append("stop").attr("offset", "34%").attr("stop-color", "#8a6d1c").attr("stop-opacity", .22);
diskGrad.append("stop").attr("offset", "68%").attr("stop-color", "#4a3a12").attr("stop-opacity", .1);
diskGrad.append("stop").attr("offset", "100%").attr("stop-color", "#000000").attr("stop-opacity", 0);

/* ============================================================
   三、古星图装饰:同心圆 + 二十八宿刻度环
   ============================================================ */
const XIU_28 = "角亢氐房心尾箕斗牛女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸".split("");
const DECO = { r1: 350, r2: 470, r3: 580, label: 626 };

function drawDecor() {
  const R = DECO;
  // 三重同心圆
  [[R.r1, "2 12", .16], [R.r2, "1 7", .2], [R.r3, null, .26]].forEach(([r, dash, op]) => {
    const c = gDecor.append("circle").attr("r", r).attr("fill", "none")
      .attr("stroke", "#c9a227").attr("stroke-opacity", op).attr("stroke-width", 1);
    if (dash) c.attr("stroke-dasharray", dash);
  });
  // 内圈再补两道细圆
  [R.r1 * .42, R.r1 * .72].forEach(r => {
    gDecor.append("circle").attr("r", r).attr("fill", "none")
      .attr("stroke", "#c9a227").attr("stroke-opacity", .09).attr("stroke-width", .8).attr("stroke-dasharray", "1 9");
  });
  // 二十八宿刻度 + 宿名
  for (let i = 0; i < 28; i++) {
    const a = (-90 + i * (360 / 28)) * Math.PI / 180;
    const x1 = Math.cos(a) * R.r3, y1 = Math.sin(a) * R.r3;
    const x2 = Math.cos(a) * (R.r3 + 18), y2 = Math.sin(a) * (R.r3 + 18);
    gDecor.append("line").attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2)
      .attr("stroke", "#c9a227").attr("stroke-opacity", .34).attr("stroke-width", 1);
    const lx = Math.cos(a) * R.label, ly = Math.sin(a) * R.label;
    gDecor.append("text").attr("x", lx).attr("y", ly).attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-family", '"Songti SC","STSong",serif').attr("font-size", 19)
      .attr("fill", "#c9a227").attr("fill-opacity", .3).text(XIU_28[i]);
  }
  // 四方刻度(每 90° 加长一点)
  for (let i = 0; i < 4; i++) {
    const a = (-90 + i * 90) * Math.PI / 180;
    gDecor.append("line")
      .attr("x1", Math.cos(a) * R.r1).attr("y1", Math.sin(a) * R.r1)
      .attr("x2", Math.cos(a) * (R.r3 + 34)).attr("y2", Math.sin(a) * (R.r3 + 34))
      .attr("stroke", "#c9a227").attr("stroke-opacity", .13).attr("stroke-width", 1);
  }
  gDecor.append("circle").attr("r", 5).attr("fill", "none")
    .attr("stroke", "#c9a227").attr("stroke-opacity", .3).attr("stroke-width", 1);
}
drawDecor();

/* ============================================================
   四、相机
   ============================================================ */
let camPan = { x: 0, y: 0 };      // 供星空视差使用的平移量
let pendingFit = false;           // 入场后等布局铺开再补一次全览
const nebula = document.getElementById("nebula");
let userTouched = false;          // 用户一旦操作过,取消自动全览

const zoom = d3.zoom().scaleExtent([0.18, 7])
  .filter(ev => !ev.ctrlKey && !ev.button && !(ev.target && ev.target.closest && ev.target.closest(".node, .link")))
  .on("zoom", ev => {
    gWorld.attr("transform", ev.transform);
    camPan.x = ev.transform.x; camPan.y = ev.transform.y;
    // 星云做极弱视差:用 transform 跟进,交给合成器,不触发重绘
    nebula.style.transform = `translate3d(${(camPan.x * .035).toFixed(1)}px,${(camPan.y * .035).toFixed(1)}px,0)`;
    // 标签反向补偿:保证屏幕上字号稳定可读(指数 .75 保留一点缩放感)
    const k = ev.transform.k;
    const st = svgRoot.node().style;
    st.setProperty("--lsk", (1 / Math.pow(k, .75)).toFixed(3));
    // 连线线宽按 1/k 完全补偿并夹住下限,避免缩小时细到看不见
    st.setProperty("--lsw", Math.max(1, Math.min(2.6, 1 / k)).toFixed(3));
    const z = k >= 1.55 ? "near" : (k >= .78 ? "mid" : "far");
    if (svgRoot.attr("data-z") !== z) { svgRoot.attr("data-z", z); scheduleCull(60); }
    scheduleCull(240);
  });
svgRoot.call(zoom).on("dblclick.zoom", null);

svgRoot.node().addEventListener("wheel", () => { userTouched = true; }, { passive: true });
svgRoot.node().addEventListener("mousedown", () => { userTouched = true; });

function contentBBox() {
  try {
    const b = gNode.node().getBBox();
    // 竖屏(手机)时装不下整圈古星图 —— 圆图按宽度缩会只占上半屏,白白浪费下半屏。
    // 所以竖屏只按星群取景,同心圆允许被裁掉。
    if (innerHeight > innerWidth * 1.15) {
      const p = 26;
      return { x: b.x - p, y: b.y - p, width: b.width + p * 2, height: b.height + p * 2 };
    }
    // 横屏:把古星图同心圆与宿名一起纳入,保证圆图完整
    const r = DECO.label + 26;
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const x0 = Math.min(b.x, cx - r), y0 = Math.min(b.y, cy - r);
    const x1 = Math.max(b.x + b.width, cx + r), y1 = Math.max(b.y + b.height, cy + r);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  } catch (e) { return null; }
}
/** 平滑飞到全览 */
function fitView(dur = 1400) {
  const b = contentBBox();
  if (!b || !b.width || !b.height) return;
  const pad = 1.06;
  const k = Math.min(innerWidth / (b.width * pad), innerHeight / (b.height * pad));
  const kk = Math.max(0.18, Math.min(7, k));
  const tx = innerWidth / 2 - (b.x + b.width / 2) * kk;
  const ty = innerHeight / 2 - (b.y + b.height / 2) * kk;
  svgRoot.transition().duration(dur).ease(d3.easeCubicInOut)
    .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(kk))
    .on("end", () => scheduleCull(40));   // 镜头停稳后重算标签避让(缩放下标签尺寸会变)
}
/**
 * 智能取景:节点已在画面舒适区(中间 62%)就不动镜头,只有跑到边缘才平移过去。
 * 这样连点几个星体不会每次都晃一遍画面。
 */
function smartFrame(d) {
  if (!d || d.x == null) return;
  const t = d3.zoomTransform(svgRoot.node());
  const sx = t.applyX(d.x), sy = t.applyY(d.y);
  const mx = innerWidth * .19, my = innerHeight * .19;
  if (sx > mx && sx < innerWidth - mx && sy > my && sy < innerHeight - my) return;
  let k = t.k;
  if (k < 1.05) k = 1.35;                       // 全览态点开时放大到能看清
  svgRoot.transition().duration(780).ease(d3.easeCubicInOut)
    .call(zoom.transform, d3.zoomIdentity.translate(innerWidth / 2, innerHeight / 2).scale(k).translate(-d.x, -d.y))
    .on("end", () => scheduleCull(40));
}

/** 平滑飞到某节点 */
function flyTo(d, kTarget, dur = 900) {
  if (!d || d.x == null) return;
  const needZoom = arguments.length < 2;
  const k = needZoom ? Math.max(d3.zoomTransform(svgRoot.node()).k, 1.35) : kTarget;
  svgRoot.transition().duration(dur).ease(d3.easeCubicInOut)
    .call(zoom.transform,
      d3.zoomIdentity.translate(innerWidth / 2, innerHeight / 2).scale(k).translate(-d.x, -d.y))
    .on("end", () => scheduleCull(40));
}

/* ============================================================
   五、力导向与渲染
   ============================================================ */
const simulation = d3.forceSimulation()
  .alphaDecay(0.018)
  .force("link", d3.forceLink().id(d => d.id)
    .distance(l => Math.min(150, 58 + 120 / Math.sqrt(((l.source.pop || 1) * (l.target.pop || 1)) + 1))))
  .force("charge", d3.forceManyBody().strength(-155).distanceMax(560))
  .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
  .force("collide", d3.forceCollide().radius(d => d.r + 15).iterations(2))
  .force("x", d3.forceX(innerWidth / 2).strength(.035))
  .force("y", d3.forceY(innerHeight / 2).strength(.035));

let vnodes = [], vlinks = [], posCache = {};
let link, node, activeId = null;

function rebuild(nodes, links, gentle) {
  const oldPos = {};
  (simulation.nodes() || []).forEach(n => { oldPos[n.id] = { x: n.x, y: n.y }; });

  vnodes = nodes.map(n => {
    const o = oldPos[n.id] || posCache[n.id];
    const core = isCore(n);
    return {
      ...n,
      r: core ? 44 : 7 + (n.pop || 1) * 2.55,
      c: FCOLOR[n.faction] || "#8a8375",
      core,
      x: o ? o.x : innerWidth / 2 + (Math.random() - .5) * 60,
      y: o ? o.y : innerHeight / 2 + (Math.random() - .5) * 60,
      fx: core ? innerWidth / 2 : (o && o.fx !== undefined ? o.fx : undefined),
      fy: core ? innerHeight / 2 : (o && o.fy !== undefined ? o.fy : undefined),
    };
  });
  vlinks = links.map(l => ({ ...l, lc: KCOLOR[l.kind] || "#6b6156", ld: KDASH[l.kind] }));
  vnodes.forEach(n => { if (n.core) { n.fx = innerWidth / 2; n.fy = innerHeight / 2; } });

  simulation.nodes(vnodes);
  simulation.force("link").links(vlinks);
  simulation.alpha(gentle ? .5 : 1).restart();

  /* ---- 连线:二次贝塞尔曲线 ---- */
  link = gLink.selectAll("path.link").data(vlinks, d => d.id);
  link.exit().remove();
  link = link.enter().append("path").attr("class", "link")
    .attr("id", d => "e-" + d.id)
    .attr("stroke", d => d.lc)
    .attr("stroke-dasharray", d => d.ld)
    .on("mouseover", (e, d) => {
      showTip(e, `<span class="k">${KNAME[d.kind] || d.kind} · 天意小纸条</span>${esc(d.note || "")}`);
      d3.select(e.currentTarget).classed("hot", true);
    })
    .on("mousemove", e => moveTip(e))
    .on("mouseout", e => { hideTip(); d3.select(e.currentTarget).classed("hot", false); })
    .merge(link);

  /* ---- 星体 ---- */
  node = gNode.selectAll("g.node").data(vnodes, d => d.id);
  node.exit().remove();

  const ent = node.enter().append("g")
    .attr("class", d => "node" + (d.core ? " core-node" : ""))
    .attr("data-pop", d => d.pop || 1)
    .attr("data-faction", d => d.faction)
    .call(d3.drag()
      .on("start", (e, d) => { if (d.core) return; if (!e.active) simulation.alphaTarget(.18).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (e, d) => { if (d.core) return; d.fx = e.x; d.fy = e.y; })
      .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); if (!d.core) { d.fx = d.x; d.fy = d.y; } }))
    .on("click", (e, d) => {
      e.stopPropagation();
      selectNode(d);
      smartFrame(d);                      // 只在节点跑到画面边缘时才挪镜头
      if (d.core) openCore(); else openNode(d);
    })
    .on("dblclick", (e, d) => { e.stopPropagation(); if (d.core) return; d.fx = null; d.fy = null; simulation.alpha(.35).restart(); })
    .on("mouseenter", (e, d) => {
      if (!activeId) setHot(d.id, false);
      gGlow.selectAll("circle.glow.lit").classed("lit", false);
      glow.filter(x => x.id === d.id).classed("lit", true);
    })
    .on("mouseleave", () => {
      if (!activeId) setHot(null, false);
      gGlow.selectAll("circle.glow.lit").classed("lit", false);
    });

  /* ---- 辉光层(在连线之下,让关系网能看清) ---- */
  let glow = gGlow.selectAll("circle.glow").data(vnodes, d => d.id);
  glow.exit().remove();
  glow = glow.enter().append("circle").attr("class", "glow")
    .attr("fill", d => d.core ? "url(#glow-wei)" : `url(#glow-${d.faction})`).merge(glow);
  glow.attr("r", d => d.r * (d.core ? 4.0 : 2.7));

  const sc = ent.append("g").attr("class", "scale");
  // 中宫吸积盘
  sc.filter(d => d.core).append("circle").attr("class", "disk").attr("r", 118)
    .attr("fill", "url(#disk)");
  // 星体
  sc.append("circle").attr("class", "core").attr("r", d => d.r)
    .attr("fill", d => d.core ? "url(#coreBody)" : `url(#body-${d.faction})`)
    .attr("stroke", d => d.core ? "none" : "rgba(4,6,10,.85)")
    .attr("stroke-width", d => d.core ? 0 : 1.1);
  // 中宫三环(反向旋转)
  const cr = sc.filter(d => d.core);
  cr.append("circle").attr("class", "ring-rot r1").attr("r", 66).attr("fill", "none")
    .attr("stroke", "#c9a227").attr("stroke-width", 1.4).attr("stroke-dasharray", "2 9").attr("opacity", .8);
  cr.append("circle").attr("class", "ring-rot r2").attr("r", 86).attr("fill", "none")
    .attr("stroke", "#e0c463").attr("stroke-width", 1).attr("stroke-dasharray", "24 16").attr("opacity", .62);
  cr.append("circle").attr("class", "ring-rot r3").attr("r", 106).attr("fill", "none")
    .attr("stroke", "#efd79a").attr("stroke-width", 1.6).attr("stroke-dasharray", "1 9").attr("opacity", .45);
  // 有素材的星:客星环
  sc.filter(d => !d.core && CLIPS[d.id] && (CLIPS[d.id].mp3 || CLIPS[d.id].mp4))
    .append("circle").attr("class", "ring").attr("r", d => d.r + 4).attr("stroke-dasharray", "3 4");
  // 选中光环 + 点击闪光
  sc.append("circle").attr("class", "halo").attr("r", d => d.r + 9)
    .attr("fill", "none").attr("stroke", d => d.c).attr("stroke-width", 1.2);
  sc.append("circle").attr("class", "flash").attr("r", d => d.r + 6);
  // 标签
  ent.append("text").attr("class", "lbl").attr("text-anchor", "middle")
    .attr("dy", d => d.r + 13).text(d => d.core ? "天 意" : d.name);

  node = ent.merge(node);
  node.select("text.lbl").text(d => d.core ? "天 意" : d.name);
  node.select("circle.core").attr("r", d => d.r);

  function ticked() {
    for (const d of vnodes) posCache[d.id] = { x: d.x, y: d.y };
    node.attr("transform", d => `translate(${d.x},${d.y})`);
    glow.attr("cx", d => d.x).attr("cy", d => d.y);
    link.attr("d", d => edgePath(d));
  }
  simulation.on("tick", ticked);
  simulation.on("end", () => {
    scheduleCull(80);
    // 入场时算包围盒那一刻布局还没铺开,会导致少数星体压在屏幕外;铺开后补一次全览
    if (pendingFit && !userTouched) { pendingFit = false; fitView(760); }
  });
  ticked();
  if (activeId) setHot(activeId);
  scheduleCull(600);
}

/* ---------- 标签避让:按出圈度优先级贪心放置,压在一起的自动隐去 ---------- */
let cullTimer = null;
function scheduleCull(delay) { clearTimeout(cullTimer); cullTimer = setTimeout(cullLabels, delay || 200); }
function labelVisible(d, z) {
  const pop = d.pop || 1;
  if (d.core) return true;
  // 窄屏同样面积能容纳的标签更少,阈值整体抬高一档
  const narrow = innerWidth < 720;
  if (z === "near") return narrow ? pop >= 3 : true;
  if (z === "mid") return narrow ? pop >= 4 : pop >= 3;
  return narrow ? pop >= 5 : pop >= 4;
}
function cullLabels() {
  if (!gNode || !vnodes.length) return;
  const z = svgRoot.attr("data-z") || "mid";
  const items = [];
  gNode.selectAll("g.node").each(function (d) {
    const lbl = this.querySelector("text.lbl");
    if (!lbl) return;
    const show = labelVisible(d, z);
    lbl.classList.toggle("off", !show);
    if (!show) { lbl.classList.remove("culled"); return; }
    const b = lbl.getBoundingClientRect();
    items.push({ lbl, x: b.x, y: b.y, w: b.width, h: b.height, pri: d.core ? 99 : (d.pop || 1) });
  });
  items.sort((a, b) => b.pri - a.pri);
  const placed = [];
  for (const it of items) {
    let hit = false;
    for (const p of placed) {
      if (it.x < p.x + p.w && p.x < it.x + it.w && it.y < p.y + p.h && p.y < it.y + it.h) { hit = true; break; }
    }
    if (hit) it.lbl.classList.add("culled");
    else { it.lbl.classList.remove("culled"); placed.push(it); }
  }
}

function hashDir(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h % 2 ? 1 : -1; }
function edgePath(d) {
  const sx = d.source.x, sy = d.source.y, tx = d.target.x, ty = d.target.y;
  const dx = tx - sx, dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  const cur = Math.min(34, len * .16) * hashDir(d.id);
  const mx = (sx + tx) / 2 - dy / len * cur;
  const my = (sy + ty) / 2 + dx / len * cur;
  return `M${sx},${sy} Q${mx},${my} ${tx},${ty}`;
}

/* ============================================================
   六、激活态:光点沿边流动
   ============================================================ */
let flows = [];
/**
 * 点亮某个节点的关系线。
 * hard=false(悬停):只提亮相关线,其余不动 —— 否则鼠标一进画面整张网就暗掉。
 * hard=true(选中):其余线压暗,突出这一支关系网。
 */
function setHot(id, hard) {
  flows = [];
  gFlow.selectAll("*").remove();
  if (!id) {
    gLink.selectAll("path.link").classed("hot", false).classed("dim", false);
    return;
  }
  const touching = vlinks.filter(l => (l.source.id || l.source) === id || (l.target.id || l.target) === id);
  const tset = new Set(touching);
  gLink.selectAll("path.link")
    .classed("hot", d => tset.has(d))
    .classed("dim", d => !!hard && !tset.has(d));
  touching.forEach((l, i) => {
    const p = document.getElementById("e-" + l.id);
    if (!p) return;
    let len = 0;
    try { len = p.getTotalLength(); } catch (e) { return; }
    const el = gFlow.append("circle").attr("class", "flow").attr("r", 2.3).node();
    flows.push({ el, path: p, len, t: (i * .27) % 1, speed: .00042 });
  });
}
function updateFlows(now, dt) {
  for (const f of flows) {
    f.t += f.speed * dt; if (f.t > 1) f.t -= 1;
    let pt;
    try { pt = f.path.getPointAtLength(f.t * f.len); } catch (e) { continue; }
    f.el.setAttribute("transform", `translate(${pt.x},${pt.y})`);
  }
}

/* ============================================================
   七、涟漪:点击节点时,天意自中宫沿关系网传播过去
   ============================================================ */
const ADJ = (() => {
  const a = {};
  for (const l of LINKS) {
    (a[l.source] = a[l.source] || []).push({ to: l.target, id: l.id });
    (a[l.target] = a[l.target] || []).push({ to: l.source, id: l.id });
  }
  return a;
})();
function bfsPath(from, to) {
  if (from === to) return [from];
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const cur = q.shift();
    for (const e of (ADJ[cur] || [])) {
      if (e.to in prev) continue;
      prev[e.to] = { from: cur, edge: e.id };
      if (e.to === to) {
        const out = []; let c = to;
        while (c !== from) { out.unshift({ id: c, edge: prev[c].edge }); c = prev[c].from; }
        return out;
      }
      q.push(e.to);
    }
  }
  return null;
}
function rippleTo(targetId) {
  const chain = bfsPath(CORE_ID, targetId);
  if (!chain || !chain.length) { flashNode(targetId); return; }
  chain.forEach((step, i) => {
    const pathEl = document.getElementById("e-" + step.edge);
    if (!pathEl) return;
    let len = 0;
    try { len = pathEl.getTotalLength(); } catch (e) { return; }
    const dot = gRipple.append("circle").attr("class", "ripple").attr("r", 3.2);
    const delay = i * 170;
    dot.transition().delay(delay).duration(300).ease(d3.easeCubicInOut)
      .attrTween("transform", () => t => {
        const pt = pathEl.getPointAtLength(t * len);
        return `translate(${pt.x},${pt.y})`;
      })
      .transition().duration(240).attr("r", 0).remove();
    setTimeout(() => flashNode(step.id), delay + 250);
  });
}
function flashNode(id) {
  const g = gNode.selectAll("g.node").filter(d => d.id === id);
  if (g.empty()) return;
  g.classed("flashing", false);
  void g.node().offsetWidth;
  g.classed("flashing", true);
  setTimeout(() => g.classed("flashing", false), 780);
}

/* ============================================================
   八、选中节点
   ============================================================ */
function selectNode(d) {
  activeId = d.id;
  gNode.selectAll("g.node").classed("sel", x => x.id === d.id);
  gGlow.selectAll("circle.glow").classed("lit", x => x.id === d.id);
  setHot(d.id, true);
  if (!d.core) rippleTo(d.id);
  else flashCore();
}
function flashCore() {
  const g = gNode.selectAll("g.node").filter(x => x.core);
  g.classed("flashing", false); void g.node().offsetWidth; g.classed("flashing", true);
  setTimeout(() => g.classed("flashing", false), 780);
}

/* ============================================================
   九、面板 / 播放 / 提示
   ============================================================ */
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function openPanel(html) {
  document.getElementById("panelBody").innerHTML = html;
  document.getElementById("panel").classList.add("open");
}
document.getElementById("panelClose").onclick = () => document.getElementById("panel").classList.remove("open");

function typeTag(n) { return `<span class="tag" style="color:${n.c};border-color:${n.c}66">${TYPE_NAME[n.type] || n.type}</span>`; }
function factionName(f) { return YUAN[f] || f; }

function nodeHTML(d) {
  let html = `<h2>${esc(d.name)}</h2><div class="sub">${typeTag(d)} <span class="tag" style="color:${d.c};border-color:${d.c}66">${factionName(d.faction)}</span> 出圈度:${"●".repeat(Math.min(5, d.pop || 1))}${"○".repeat(Math.max(0, 5 - (d.pop || 1)))}</div>`;
  if (d.actor) html += `<div class="field"><b>说话人</b> · ${esc(d.actor)}</div>`;
  if (d.ep) html += `<div class="field"><b>出处</b> · ${esc(d.ep)}</div>`;
  if (d.line) html += `<div class="quote-block">“${esc(d.line)}”</div>`;
  if (d.why) html += `<div class="field"><b>为什么是梗</b><br>${esc(d.why)}</div>`;
  if (d.contrast) html += `<div class="field"><b>原著对比 / 考据</b><br><span class="muted">${esc(d.contrast)}</span></div>`;
  if (d.r9) html += `<div class="field">★ <b>被 R9 / 二创捧红</b></div>`;
  const hasClip = CLIPS[d.id] && (CLIPS[d.id].mp3 || CLIPS[d.id].mp4);
  html += `<div class="field"><b>素材播放</b><br>`;
  html += hasClip
    ? `<button class="btn" onclick="window.__play('${esc(d.id)}')">▶ 播放原片片段</button>`
    : (d.noCut
      ? `<span class="muted" style="font-size:12px">🔍 ${esc(d.noCut)}</span>`
      : `<span class="muted" style="font-size:12px">⏳ 素材待剪辑(clips/${esc(d.id)}.mp3/.mp4)</span>`);
  html += `</div>`;
  html += `<div class="field" style="font-size:11.5px;color:#4d4a3f">节点 ID: ${esc(d.id)} · 剪辑文件名: clips/${esc(d.id)}.mp3/.mp4</div>`;
  return html;
}
function openNode(d) { openPanel(nodeHTML(d)); }
function openCore() {
  const real = NODES.find(n => n.id === CORE_ID);
  if (real) {
    const c = Object.assign({}, real, { c: FCOLOR[real.faction] || "#d8dee9" });
    openPanel(nodeHTML(c));
  } else openPanel(`<h2>天意</h2><div class="field">宇宙核心 · 机制之源</div>`);
}

window.__play = (id) => {
  const d = NODES.find(n => n.id === id);
  const player = document.getElementById("player");
  const body = document.getElementById("playerBody");
  document.getElementById("playerTitle").textContent = (d ? d.name : "") + " · 原片片段";
  const meta = CLIPS[id] || {};
  if (meta.mp4) body.innerHTML = `<video controls autoplay loop src="clips/${id}.mp4"></video>`;
  else if (meta.mp3) body.innerHTML = `<audio controls autoplay src="clips/${id}.mp3"></audio>`;
  else body.innerHTML = `<span class="ph">该梗素材未剪辑。<br>命名 <b>${id}.mp3</b> 或 <b>${id}.mp4</b> 放入 clips/ 后刷新即可。</span>`;
  player.style.display = "block";
  bgmHoldOn();                                   // 播原片时让出声道
  const a = body.querySelector("audio");
  if (a) a.addEventListener("ended", bgmHoldOff); // 片段自然播完就恢复 BGM
};
document.getElementById("playerClose").onclick = () => {
  document.getElementById("player").style.display = "none";
  document.getElementById("playerBody").innerHTML = "";
  bgmHoldOff();                                  // 关闭播放器 → BGM 续上
};

window.__playAt = (ep, sec) => {
  const n = parseInt(ep.replace(/\D/g, ""), 10);
  if (!n || n < 1 || n > 95) return;
  if (ONLINE) { toast(`第 ${n} 集 ${sec}s · 线上版不含整集源片(版权),此功能需下载源片本地打开`); return; }
  const file = `新三国/新三国${String(n).padStart(2, "0")}.mkv`;
  const player = document.getElementById("player");
  const body = document.getElementById("playerBody");
  document.getElementById("playerTitle").textContent = `第${n}集 @ ${sec}s · 定位播放`;
  body.innerHTML = `<video controls autoplay src="${file}#t=${sec}"></video><div class="p-title" style="margin-top:8px">正在从 ${sec}s 播放 · 若黑屏说明本地缺源片</div>`;
  player.style.display = "block";
};

let toastTimer = null;
function toast(msg) {
  const t = document.getElementById("toast");
  t.innerHTML = msg; t.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = "none"; }, 3400);
}

const tipEl = document.getElementById("tip");
function showTip(e, h) { tipEl.innerHTML = h; tipEl.style.display = "block"; moveTip(e); }
function moveTip(e) {
  const t = tipEl.getBoundingClientRect();
  let x = e.clientX + 16, y = e.clientY + 18;
  if (x + t.width > innerWidth - 10) x = e.clientX - t.width - 16;
  if (y + t.height > innerHeight - 10) y = e.clientY - t.height - 16;
  tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
}
function hideTip() { tipEl.style.display = "none"; }

/* ============================================================
   十、搜索(梗节点 + 全剧台词)
   ============================================================ */
const searchInput = document.getElementById("searchInput");
const searchRes = document.getElementById("searchRes");
let searchTimer = null, curIdx = -1;

function hl(text, kw) {
  if (!kw) return esc(text);
  const i = text.toLowerCase().indexOf(kw.toLowerCase());
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + `<span class="hl">${esc(text.slice(i, i + kw.length))}</span>` + esc(text.slice(i + kw.length));
}
function runSearch() {
  const kw = searchInput.value.trim();
  const box = searchRes;
  if (!kw) { box.style.display = "none"; return; }
  const lower = kw.toLowerCase();
  const nodeHits = NODES.filter(n =>
    (n.name || "").toLowerCase().includes(lower) ||
    (n.line || "").toLowerCase().includes(lower) ||
    (n.why || "").toLowerCase().includes(lower) ||
    (n.actor || "").toLowerCase().includes(lower) ||
    (n.id || "").toLowerCase().includes(lower));
  const kwClean = kw.replace(/[\s""'']/g, "");
  const scriptHits = [];
  if (kwClean) {
    outer:
    for (const ep of SCRIPT_EPS) {
      const arr = SCRIPT[ep];
      if (!arr) continue;
      let cnt = 0;
      for (const row of arr) {
        const sp = row.indexOf(" ");
        const sec = row.slice(0, sp);
        const txt = row.slice(sp + 1);
        if (txt.toLowerCase().includes(lower) || txt.includes(kwClean)) {
          scriptHits.push({ ep, sec: parseInt(sec, 10), txt });
          if (++cnt >= 6) break;
        }
        if (scriptHits.length >= 14) break outer;
      }
    }
  }
  let h = "";
  if (!nodeHits.length && !scriptHits.length) h = `<div class="res-more" style="padding:16px 14px">无命中。试试演员名 / 台词词 / 梗名。</div>`;
  if (nodeHits.length) {
    h += `<div class="res-group">梗节点 ${nodeHits.length} <span style="display:inline;font-size:11px;color:#8a8375">(回车直达)</span></div>`;
    for (const n of nodeHits.slice(0, 8)) {
      const clipMark = (CLIPS[n.id] && (CLIPS[n.id].mp3 || CLIPS[n.id].mp4)) ? " 🎵" : "";
      h += `<button class="res-item" data-kind="node" onclick="goNode('${esc(n.id)}')">
        <span class="t">${hl(n.name, kw)}${clipMark}</span>
        <span class="m">${esc((n.actor || "") + " · " + (n.ep || ""))}</span>
        ${n.line ? `<span class="m">${hl(n.line, kw)}</span>` : ""}
      </button>`;
    }
    if (nodeHits.length > 8) h += `<div class="res-more">…还有 ${nodeHits.length - 8} 个梗节点</div>`;
  }
  if (scriptHits.length) {
    h += `<div class="res-group">原片台词(第${(scriptHits[0].ep || "").replace("ep", "")}集起…)</div>`;
    for (const s of scriptHits.slice(0, 10)) {
      h += `<button class="res-item" data-kind="script" onclick="playScript('${s.ep}','${s.sec}')">
        <span class="t">${hl(s.txt, kw)}</span>
        <span class="m">第${s.ep.replace("ep", "")}集 · ${s.sec}s · 点击定位播放</span>
      </button>`;
    }
    if (scriptHits.length > 10) h += `<div class="res-more">…还有 ${scriptHits.length - 10} 条</div>`;
  }
  box.innerHTML = h;
  box.style.display = "block";
  curIdx = -1; moveCur(1);
}
function items() { return Array.prototype.slice.call(searchRes.querySelectorAll(".res-item")); }
function moveCur(dir) {
  const it = items();
  if (!it.length) { curIdx = -1; return; }
  if (dir === 1) curIdx = (curIdx + 1) % it.length;
  else if (dir === -1) curIdx = curIdx <= 0 ? it.length - 1 : curIdx - 1;
  else { const ni = it.findIndex(x => x.dataset.kind === "node"); curIdx = ni >= 0 ? ni : 0; }
  it.forEach((x, i) => x.classList.toggle("cur", i === curIdx));
  const cur = it[curIdx];
  if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
}
function hitCur() { const it = items(); if (it[curIdx]) it[curIdx].click(); }

window.goNode = (id) => {
  searchRes.style.display = "none"; searchInput.value = "";
  const real = NODES.find(n => n.id === id); if (!real) return;
  const inMode = mode === "all" || (mode === "pop" ? (real.pop || 1) >= 4 : (real.r9 || id === CORE_ID));
  if (!inMode) { mode = "all"; paintBtns(); applyFilter(); }
  const cur = simulation.nodes().find(n => n.id === id);
  if (cur) flyTo(cur, Math.max(d3.zoomTransform(svgRoot.node()).k, 1.5));
  const vis = vnodes.find(n => n.id === id) || Object.assign({}, real, { c: FCOLOR[real.faction], core: isCore(real) });
  selectNode(vis);
  if (isCore(real)) openCore(); else openNode(vis);
};
window.playScript = (ep, sec) => {
  searchRes.style.display = "none";
  const n = ep.replace("ep", "");
  if (ONLINE) toast(`第 <b>${n}</b> 集 <b>${sec}s</b> · 线上版已标注位置;下载源片本地打开可整集定位播放`);
  else toast(`正在从第 <b>${n}</b> 集 <b>${sec}s</b> 定位播放…`);
  window.__playAt(ep, sec);
};
searchInput.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 160); });
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (searchRes.style.display === "none") runSearch();
    if (items().length) { if (curIdx >= 0) hitCur(); else { moveCur(0); hitCur(); } }
    return;
  }
  if (e.key === "ArrowDown") { e.preventDefault(); if (searchRes.style.display === "block") moveCur(1); else { runSearch(); moveCur(0); } }
  if (e.key === "ArrowUp") { e.preventDefault(); if (searchRes.style.display === "block") moveCur(-1); }
  if (e.key === "Escape") { searchRes.style.display = "none"; searchInput.blur(); }
});
document.addEventListener("click", (e) => { if (!e.target.closest("#searchWrap")) searchRes.style.display = "none"; });

/* ============================================================
   十一、筛选 / 复位
   ============================================================ */
let mode = "all";
function applyFilter(gentle) {
  let active = mode === "all" ? NODES
    : mode === "pop" ? NODES.filter(n => (n.pop || 1) >= 4)
    : NODES.filter(n => n.r9);
  const ids = new Set(active.map(n => n.id));
  ids.add(CORE_ID);                                  // 中宫常驻
  active = NODES.filter(n => ids.has(n.id));
  const activeLinks = LINKS.filter(l => ids.has(l.source) && ids.has(l.target));
  rebuild(active, activeLinks, gentle);
  document.getElementById("count").textContent = `共 ${NODES.length} 个梗节点 · ${LINKS.length} 条天意线 · 当前显示 ${active.length}`;
}
function paintBtns() {
  document.querySelectorAll("#toolbar .btn").forEach(b => b.classList.remove("on"));
  const map = { all: "btn-all", pop: "btn-pop", r9: "btn-r9" };
  const el = document.getElementById(map[mode]); if (el) el.classList.add("on");
}
document.getElementById("btn-all").onclick = () => { mode = "all"; paintBtns(); applyFilter(true); };
document.getElementById("btn-pop").onclick = () => { mode = "pop"; paintBtns(); applyFilter(true); };
document.getElementById("btn-r9").onclick = () => { mode = "r9"; paintBtns(); applyFilter(true); };
document.getElementById("btn-reset").onclick = () => {
  simulation.nodes().forEach(n => { if (!n.core) { n.fx = null; n.fy = null; } });
  selectNodeClear();
  simulation.alpha(.6).restart();
  setTimeout(() => fitView(900), 260);
};
document.getElementById("btn-fit").onclick = () => fitView(1000);

function selectNodeClear() {
  activeId = null;
  gNode.selectAll("g.node").classed("sel", false);
  gGlow.selectAll("circle.glow").classed("lit", false);
  setHot(null, false);
}

/* ============================================================
   十二、漫游 / 播片模式(录屏用)
   ============================================================ */
const ROAM_ORDER = ["tiyi", "jiaobing", "cao-gai", "cao-buke", "cao-ku", "xunyu", "liubei-zijin",
  "guanyu-zhonger", "sunce-chengdi", "wangyun-shengsi", "zhugeliang-huo", "simayi-silun",
  "sunquan-yi", "panfeng", "xingdaorong", "wujiaosha"];
let roamTimer = null, roamIdx = 0, filmMode = false;
const filmAudio = new Audio();
filmAudio.preload = "auto";

function captionFor(d) {
  const cap = document.getElementById("caption");
  if (!d) { cap.classList.remove("show"); return; }
  const epClean = (d.ep || "").replace(/^第/, "第 ").replace(/集$/, " 集");
  cap.innerHTML = `<div class="c-name">${esc(d.name)}</div>`
    + (d.line ? `<div class="c-line">“${esc(d.line)}”</div>` : "")
    + `<div class="c-meta">${esc([d.actor, epClean].filter(Boolean).join(" · "))}</div>`;
  cap.classList.add("show");
}
function captionClear() { document.getElementById("caption").classList.remove("show"); }

function roamStep() {
  const id = ROAM_ORDER[roamIdx % ROAM_ORDER.length]; roamIdx++;
  let d = vnodes.find(n => n.id === id);
  if (!d) { applyFilter(true); d = vnodes.find(n => n.id === id); }
  if (!d) return;
  selectNode(d);
  flyTo(d, filmMode ? 1.75 : Math.max(d3.zoomTransform(svgRoot.node()).k, 1.3), filmMode ? 2600 : 1100);
  if (filmMode) {
    captionFor(d);
    const meta = CLIPS[id] || {};
    const src = meta.mp3 ? `clips/${id}.mp3` : (meta.mp4 ? `clips/${id}.mp4` : null);
    if (src) { filmAudio.src = src; filmAudio.currentTime = 0; filmAudio.play().catch(() => {}); }
    else filmAudio.pause();
  }
}
function setFilmMode(on) {
  filmMode = on;
  document.body.classList.toggle("film", on);
  const b = document.getElementById("btn-film");
  b.textContent = on ? "■ 退出播片" : "🎬 播片模式";
  b.classList.toggle("on", on);
  if (on) {
    hideTip();
    document.getElementById("panel").classList.remove("open");
    document.getElementById("player").style.display = "none";
    document.getElementById("searchRes").style.display = "none";
    bgmHoldOn();                                  // 播片模式全程由原片台词占声道,不叠 BGM
    if (!roamTimer) { roamIdx = 0; roamTimer = setInterval(roamStep, 5200); roamStep(); }
  } else {
    filmAudio.pause();
    captionClear();
    bgmHoldOff();
    if (roamTimer) { clearInterval(roamTimer); roamTimer = null; }
    document.getElementById("btn-play").textContent = "▶ 漫游";
    document.getElementById("btn-play").classList.remove("on");
  }
}
document.getElementById("btn-film").onclick = () => setFilmMode(!filmMode);

document.getElementById("btn-play").onclick = () => {
  const b = document.getElementById("btn-play");
  if (roamTimer) {
    clearInterval(roamTimer); roamTimer = null;
    b.textContent = "▶ 漫游"; b.classList.remove("on"); captionClear(); filmAudio.pause();
    document.getElementById("btn-film").classList.remove("on");
    document.body.classList.remove("film"); filmMode = false;
    return;
  }
  b.textContent = "⏸ 停止"; b.classList.add("on");
  roamIdx = 0; roamStep();
  roamTimer = setInterval(roamStep, 3000);
};

/* ============================================================
   十二点五、主页 BGM:关羽之歌
   进入宇宙即循环播放;一旦开始播具体梗的原片片段就暂停,片段结束或播放器关闭后恢复。
   注意:浏览器自动播放策略要求先有用户手势 —— 所以只能在"进入宇宙"那次点击之后起播。
   ============================================================ */
// 长循环版(由 tools/30_bgm_build.py 从全剧多处「关羽之歌」拼成) →
// 缺失时自动回退到 16 秒的原片片段,保证页面永远不会因为少一个文件而没声音。
const BGM_SOURCES = ["assets/bgm-guanyuzhige.mp3", "clips/guanyuzhige.mp3"];
let bgmSrcIdx = 0;
const bgm = new Audio(BGM_SOURCES[0]);
bgm.loop = true;
bgm.preload = "auto";
bgm.volume = .34;                        // 明显低于原片片段,不抢台词
bgm.addEventListener("error", () => {
  if (bgmSrcIdx < BGM_SOURCES.length - 1) {
    bgmSrcIdx++;
    bgm.src = BGM_SOURCES[bgmSrcIdx];
    console.warn("[天意宇宙] BGM 缺失,回退到", BGM_SOURCES[bgmSrcIdx]);
    bgmPlay();
  }
});

const bgmStore = {
  get() { try { return localStorage.getItem("tianyi.bgm"); } catch (e) { return null; } },  // file:// 下可能抛 SecurityError
  set(v) { try { localStorage.setItem("tianyi.bgm", v); } catch (e) {} },
};
let bgmOn = bgmStore.get() !== "off";    // 默认开
let bgmHold = false;                     // 被"正在播原片"占住

function bgmWanted() { return bgmOn && !bgmHold && !filmMode && !document.hidden; }
function bgmPlay() { if (bgmWanted()) bgm.play().catch(() => {}); }
function bgmStop() { try { bgm.pause(); } catch (e) {} }
function bgmHoldOn() { bgmHold = true; bgmStop(); }
function bgmHoldOff() { bgmHold = false; bgmPlay(); }
function bgmPaint() {
  const b = document.getElementById("btn-bgm");
  if (!b) return;
  b.classList.toggle("off", !bgmOn);
  const i = b.querySelector("i"); if (i) i.textContent = bgmOn ? "🔊" : "🔇";
  b.title = bgmOn ? "背景音乐:关羽之歌(点击关闭)" : "背景音乐已关闭(点击开启)";
}
document.getElementById("btn-bgm").onclick = () => {
  bgmOn = !bgmOn;
  bgmStore.set(bgmOn ? "on" : "off");
  bgmPaint();
  if (bgmOn) bgmPlay(); else bgmStop();
};
// 切到别的标签页就静音,回来再续上
document.addEventListener("visibilitychange", () => { if (document.hidden) bgmStop(); else bgmPlay(); });
bgmPaint();
window.__bgm = bgm;   // 调试/自测用钩子:__bgm.paused / __bgm.volume / __bgm.duration

/* ---------- 快捷键 ---------- */
addEventListener("keydown", (e) => {
  if (e.target === searchInput) return;
  const k = e.key.toLowerCase();
  if (k === "h") { setFilmMode(!filmMode); }
  else if (k === "f") { fitView(1000); }
  else if (k === "r") { document.getElementById("btn-reset").click(); }
  else if (k === "escape") {
    if (filmMode) setFilmMode(false);
    else { document.getElementById("panel").classList.remove("open"); selectNodeClear(); }
  }
  else if (k === " ") { e.preventDefault(); document.getElementById("btn-play").click(); }
});

/* ============================================================
   十三、主循环
   ============================================================ */
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(64, now - lastT); lastT = now;
  drawStars(now);
  updateFlows(now, dt);
  if (now > nextMeteor) { spawnMeteor(); nextMeteor = now + 6000 + Math.random() * 12000; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener("resize", () => {
  simulation.force("center").x(innerWidth / 2).y(innerHeight / 2);
  simulation.force("x").x(innerWidth / 2);
  simulation.force("y").y(innerHeight / 2);
  const c = simulation.nodes().find(n => n.core);
  if (c) { c.fx = innerWidth / 2; c.fy = innerHeight / 2; }
  recenter();
  simulation.alpha(.3).restart();
});

/* ============================================================
   十四、开场
   ============================================================ */
document.getElementById("count").textContent = `共 ${NODES.length} 个梗节点 · ${LINKS.length} 条天意线`;
document.getElementById("splash").addEventListener("click", () => {
  const sp = document.getElementById("splash");
  sp.classList.add("gone");
  setTimeout(() => { sp.style.display = "none"; }, 900);
  // 先近距离看中宫,再缓缓拉开给出全貌 —— "入宇宙"的运镜
  const z0 = d3.zoomIdentity
    .translate(innerWidth / 2, innerHeight / 2).scale(1.1)
    .translate(-innerWidth / 2, -innerHeight / 2);
  svgRoot.call(zoom.transform, z0);
  pendingFit = true;
  bgmPlay();                 // 借这次点击起播 BGM(浏览器要求先有用户手势)
  applyFilter(false);
  setTimeout(() => { if (!userTouched) fitView(2200); }, 1500);
});

})();
