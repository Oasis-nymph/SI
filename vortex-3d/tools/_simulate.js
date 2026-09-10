/*
 * _simulate.js — 用 Node 版最小 DOM + WebGL 模拟器把 index.html 真的跑起来
 *
 * 目的：在没有浏览器的环境里抓“空白画布”类问题
 *   - 任何 JS 异常（含栈）
 *   - 属性数组缓冲长度是否满足 drawElements 要求（不满足会 INVALID_OPERATION、整帧不画）
 *   - 索引最大值是否越界、绘制调用是否真的发生
 *   - 关键 uniform 的取值
 * 注意：它无法验证 GLSL 是否能编译（浏览器独有），但能覆盖其余部分。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ------------------------- DOM 模拟 ------------------------- */
function El(tag) {
  this.tagName = tag; this.id = ''; this.className = ''; this.dataset = {};
  this.style = {}; this.children = []; this.textContent = ''; this.innerHTML = '';
  this.type = ''; this.value = '0'; this.checked = false; this.listeners = {};
  this._cls = new Set();
  const self = this;
  this.classList = {
    add: c => self._cls.add(c), remove: c => self._cls.delete(c),
    contains: c => self._cls.has(c),
    toggle: (c, on) => { if (on === undefined) { self._cls.has(c) ? self._cls.delete(c) : self._cls.add(c); } else if (on) { self._cls.add(c); } else { self._cls.delete(c); } }
  };
}
El.prototype.appendChild = function (c) { this.children.push(c); return c; };
El.prototype.removeChild = function (c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); } return c; };
El.prototype.addEventListener = function (t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); };
El.prototype.setAttribute = function () { };
El.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, right: 220, bottom: 46, width: 220, height: 46 }; };
El.prototype.querySelectorAll = function () { return []; };
El.prototype.click = function () { };

const byId = new Map();
function ensure(id) { if (!byId.has(id)) { const e = new El('div'); e.id = id; byId.set(id, e); } return byId.get(id); }
// index.html 里真实存在的 id
const REAL_IDS = [...html.matchAll(/id="([A-Za-z0-9_-]+)"/g)].map(m => m[1]);
REAL_IDS.forEach(ensure);
['s-swirl', 's-inward', 's-stretch', 's-morph'].forEach(id => {
  ensure(id).value = id === 's-morph' ? '0' : '1';
});
['c-auto', 'c-flow', 'c-labels', 'c-axis'].forEach(id => { ensure(id).checked = true; });
// canvas：真实浏览器里 width/height 由脚本设置，这里给出初始的 CSS 尺寸
const canvasEl = ensure('gl');
canvasEl.tagName = 'canvas';
canvasEl.clientWidth = 1280;
canvasEl.clientHeight = 800;
canvasEl.width = 0;
canvasEl.height = 0;

const modeButtons = [];
const document = {
  getElementById(id) { return byId.get(id) || null; },
  createElement(tag) { return new El(tag); },
  createElementNS(ns, tag) { return new El(tag); },
  querySelectorAll(sel) { return sel === '#modes button' ? modeButtons : []; },
  body: new El('body'),
  addEventListener() { }
};

/* ------------------------- requestAnimationFrame ------------------------- */
let rafQueue = [];
const requestAnimationFrame = fn => { rafQueue.push(fn); return rafQueue.length; };

/* ------------------------- WebGL 模拟 ------------------------- */
const glLog = { draws: [], errors: [], uniforms: {}, attribs: {}, programs: 0, shaders: 0 };
const buffers = new Map();
let attribState = {};       // loc -> {buf, size, enabled}
let usedAttribs = new Set();
let curIndexBuf = null;
let drawSeq = 0;

function Buf() { this.data = null; this.target = 0; this.id = ++Buf.n; }
Buf.n = 0;

const gl = {
  ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893, STATIC_DRAW: 0x88E4,
  FLOAT: 0x1406, UNSIGNED_INT: 0x1405, TRIANGLES: 4,
  VERTEX_SHADER: 0x8B31, FRAGMENT_SHADER: 0x8B30,
  COMPILE_STATUS: 0x8B81, LINK_STATUS: 0x8B82,
  DEPTH_TEST: 0x0B71, CULL_FACE: 0x0B44, BACK: 0x0405,
  COLOR_BUFFER_BIT: 0x4000, DEPTH_BUFFER_BIT: 0x100,

  createShader(t) { glLog.shaders++; return { type: t, src: '' }; },
  shaderSource(s, src) { s.src = src; },
  compileShader() { },
  getShaderParameter() { return true; },          // 模拟编译成功（GLSL 无法在 Node 里校验）
  getShaderInfoLog() { return ''; },
  createProgram() { glLog.programs++; return {}; },
  attachShader() { }, linkProgram() { },
  getProgramParameter() { return true; },
  getProgramInfoLog() { return ''; },
  useProgram() { },
  getAttribLocation(p, n) { usedAttribs.add(n); return 'loc_' + n; },
  getUniformLocation(p, n) { return 'u_' + n; },

  createBuffer() { const b = new Buf(); buffers.set(b.id, b); return b; },
  deleteBuffer(b) { if (b) { buffers.delete(b.id); } },
  bindBuffer(target, b) {
    if (target === gl.ELEMENT_ARRAY_BUFFER) { curIndexBuf = b; }
    else { gl._boundArray = b; }
    if (b) { b.target = target; }
  },
  bufferData(target, data) {
    const b = target === gl.ELEMENT_ARRAY_BUFFER ? curIndexBuf : gl._boundArray;
    if (!b) { glLog.errors.push('bufferData 时没有绑定缓冲'); return; }
    b.data = data; b.target = target;
  },
  enableVertexAttribArray(loc) { attribState[loc] = attribState[loc] || {}; attribState[loc].enabled = true; },
  disableVertexAttribArray(loc) { attribState[loc] = attribState[loc] || {}; attribState[loc].enabled = false; },
  vertexAttribPointer(loc, size, type, norm, stride, offset) {
    attribState[loc] = attribState[loc] || {};
    attribState[loc].buf = gl._boundArray; attribState[loc].size = size;
    attribState[loc].stride = stride; attribState[loc].offset = offset;
  },
  vertexAttrib3f(loc, x, y, z) { attribState[loc] = attribState[loc] || {}; attribState[loc].const = [x, y, z]; },

  clearColor() { }, clear() { }, enable() { }, disable() { }, cullFace() { }, viewport() { },
  uniform1f(loc, v) { glLog.uniforms[loc] = v; },
  uniform3fv(loc, v) { glLog.uniforms[loc] = Array.from(v).map(x => +x.toFixed(3)); },
  uniformMatrix4fv(loc, t, v) { glLog.uniforms[loc] = Array.from(v).map(x => +x.toFixed(4)); },

  drawElements(mode, count, type, offset) {
    drawSeq++;
    const rec = { seq: drawSeq, count: count, type: type, errors: [] };
    if (!curIndexBuf || !curIndexBuf.data) { rec.errors.push('没有绑定索引缓冲'); }
    else {
      const idx = curIndexBuf.data;
      if (idx.length < count) { rec.errors.push('索引数量不足: ' + idx.length + ' < ' + count); }
      let maxIdx = 0;
      for (let i = 0; i < count; i++) { if (idx[i] > maxIdx) { maxIdx = idx[i]; } }
      rec.maxIndex = maxIdx;
      // 核心检查：已启用的属性数组缓冲必须覆盖到 maxIndex
      for (const loc in attribState) {
        const st = attribState[loc];
        if (!st.enabled) { continue; }
        if (!st.buf) { rec.errors.push(loc + ' 已启用但没有缓冲'); continue; }
        const stride = st.stride > 0 ? st.stride : st.size * 4;
        const needFloats = Math.floor(st.offset / 4) + (maxIdx * stride + st.size * 4) / 4;
        const haveFloats = st.buf.data.length;
        if (haveFloats < needFloats) {
          rec.errors.push('★' + loc + ' 缓冲太小: ' + haveFloats + ' floats < 需要 ' + needFloats +
            '（真实 WebGL 会 INVALID_OPERATION，整帧不画）');
        }
      }
    }
    glLog.draws.push(rec);
    if (rec.errors.length) { glLog.errors.push('draw#' + rec.seq + ': ' + rec.errors.join(' | ')); }
  },
  getExtension(n) { return n === 'OES_element_index_uint' ? {} : null; }
};

/* ------------------------- window / 运行脚本 ------------------------- */
const rafTimers = [];
const window = {
  document: document,
  devicePixelRatio: 1,
  innerWidth: 1280, innerHeight: 800,
  addEventListener() { },
  requestAnimationFrame: requestAnimationFrame,
  performance: { now: () => Date.now() },
  location: { search: '' },
  setTimeout: (f, ms) => { const t = setTimeout(f, ms); rafTimers.push(t); return t; },
  clearTimeout: t => clearTimeout(t)
};
document.getElementById('gl').getContext = () => gl;

const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log('脚本块: ' + blocks.length);

let failed = false;
blocks.forEach((src, i) => {
  try {
    const fn = new Function('window', 'document', 'requestAnimationFrame', 'performance', 'location', 'navigator', src);
    fn(window, document, requestAnimationFrame, window.performance, window.location, { userAgent: 'node' });
    console.log('脚本块 ' + i + ' 执行: OK');
  } catch (e) {
    failed = true;
    console.log('脚本块 ' + i + ' ★抛出异常: ' + e.message);
    console.log(e.stack.split('\n').slice(0, 6).join('\n'));
  }
});

/* ------------------------- 跑几帧 ------------------------- */
for (let f = 0; f < 4; f++) {
  const q = rafQueue; rafQueue = [];
  q.forEach(fn => {
    try { fn(1000 + f * 16); } catch (e) {
      failed = true;
      console.log('★第 ' + f + ' 帧抛出异常: ' + e.message);
      console.log(e.stack.split('\n').slice(0, 6).join('\n'));
    }
  });
}

console.log('\n=== 运行统计 ===');
console.log('着色器创建 ' + glLog.shaders + ' 个, 程序 ' + glLog.programs + ' 个');
console.log('绘制调用 ' + glLog.draws.length + ' 次: ' + glLog.draws.map(d => d.count + ' 索引(maxIdx=' + d.maxIndex + ')').join(', '));
console.log('模式按钮构建: ' + (byId.get('modes') ? byId.get('modes').children.length : 0) + ' 个');
console.log('图注元素: ' + (byId.get('labels') ? byId.get('labels').children.length : 0) + ' 个');
console.log('未使用的 attribute（着色器里会被优化掉）: ' + ['aPos', 'aNormal', 'aColor', 'aSeed', 'aParam', 'aAnimC', 'aAnimT', 'aMorphPos', 'aMorphNrm'].filter(n => !usedAttribs.has(n)).join(', '));

/* ------------------------- 投影落点校验（相机链路） ------------------------- */
const U = glLog.uniforms;
const projM = U.u_uProj, viewM = U.u_uView;
console.log('\n=== 相机链路 ===');
console.log('uCam = ' + JSON.stringify(U.u_uCam));
if (Array.isArray(projM)) {
  const vp = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) { s += projM[k * 4 + r] * viewM[c * 4 + k]; }
      vp[c * 4 + r] = s;
    }
  }
  const bad = Array.from(vp).filter(v => !Number.isFinite(v)).length;
  console.log('proj*view 含非有限值: ' + bad);
  // 把 tube 情形的包围盒角点投到屏幕
  const B2 = '/* ==== VORTEX-CORE-BEGIN ==== */', E2 = '/* ==== VORTEX-CORE-END ==== */';
  new Function(html.slice(html.indexOf(B2) + B2.length, html.indexOf(E2)))();
  const VC = globalThis.VortexCore;
  const sc = VC.buildScene({ mode: 'tube', density: 0.2 });
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9, nan = 0;
  for (let i = 0; i < sc.filaments.position.length; i += 3 * 97) {
    const p = [sc.filaments.position[i], sc.filaments.position[i + 1], sc.filaments.position[i + 2]];
    const s = VC.projectPoint(vp, canvasEl.clientWidth, canvasEl.clientHeight, p);
    if (!s) { nan++; continue; }
    mnx = Math.min(mnx, s.x); mxx = Math.max(mxx, s.x);
    mny = Math.min(mny, s.y); mxy = Math.max(mxy, s.y);
  }
  console.log('几何投影到屏幕范围: x[' + mnx.toFixed(0) + ',' + mxx.toFixed(0) + '] y[' + mny.toFixed(0) + ',' + mxy.toFixed(0) + ']' +
    '  视口 ' + canvasEl.clientWidth + 'x' + canvasEl.clientHeight + '  相机背后点数 ' + nan);
  const visible = mxx > 0 && mnx < canvasEl.clientWidth && mxy > 0 && mny < canvasEl.clientHeight;
  console.log('是否落在视口内: ' + (visible ? '是（相机会看到图形）' : '★否 —— 几何被投到视口之外'));
}
console.log('\nuLit / uMorph / uMorphAmt / uRhoMax = ' + U.u_uLit + ' / ' + U.u_uMorph + ' / ' + U.u_uMorphAmt + ' / ' + U.u_uRhoMax);
console.log('\n=== 问题 ===');
if (glLog.errors.length) {
  failed = true;
  console.log(glLog.errors.map(e => '  ★ ' + e).join('\n'));
  console.log('  （这些是真实 WebGL 会拒绝绘制的错误，必须修掉）');
} else {
  console.log('  无');
}
if (!glLog.draws.length) { failed = true; console.log('  ★ 完全没有发生绘制调用'); }
console.log(failed ? '\n结论: 存在问题（见上）' : '\n结论: 脚本执行、绘制调用与 GL 状态校验全部通过');
process.exit(failed ? 1 : 0);
