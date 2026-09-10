/*
 * render-check.js — 离线校验 index.html 里的漩涡几何与配色
 *
 * 把 index.html 中 VORTEX-CORE-BEGIN/END 之间的纯函数段抽出来，
 * 用与 GLSL 着色器逐行对应的 CPU 光栅化器渲染成 PNG，
 * 用于在没有浏览器的环境下确认几何、取景、颜色、动画是否正常。
 *
 * 用法：
 *   node tools/render-check.js <out.png> <density> <time> <mode|sheet> [yaw] [pitch] [fov] [morph]
 * mode 省略时默认 tube；sheet 会把全部情形排成一张对照图。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const BEGIN = '/* ==== VORTEX-CORE-BEGIN ==== */';
const END = '/* ==== VORTEX-CORE-END ==== */';
const i0 = html.indexOf(BEGIN), i1 = html.indexOf(END);
if (i0 < 0 || i1 < 0) { throw new Error('未找到 VORTEX-CORE 标记'); }
new Function(html.slice(i0 + BEGIN.length, i1))();
const V = globalThis.VortexCore;

const OUT = process.argv[2] || path.join(ROOT, 'tools', 'preview.png');
const DENSITY = process.argv[3] ? parseFloat(process.argv[3]) : 0.5;
const TIME = process.argv[4] ? parseFloat(process.argv[4]) : 0.9;
const MODE = process.argv[5] || 'tube';
const MORPH = process.argv[8] !== undefined ? parseFloat(process.argv[8]) : null;

/* --------------------------- 数值体检 --------------------------- */
const problems = [];
function checkMesh(name, m, uni) {
  let nan = 0, minR = Infinity, maxR = -Infinity;
  const bbox = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]];
  for (let i = 0; i < m.position.length; i += 3) {
    const x = m.position[i], y = m.position[i + 1], z = m.position[i + 2];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) { nan++; continue; }
    const r = Math.hypot(x, z);
    if (r < minR) minR = r; if (r > maxR) maxR = r;
    const p = [x, y, z];
    for (let k = 0; k < 3; k++) {
      if (p[k] < bbox[k][0]) bbox[k][0] = p[k];
      if (p[k] > bbox[k][1]) bbox[k][1] = p[k];
    }
  }
  let colBad = 0;
  const colMin = [9, 9, 9], colMax = [-9, -9, -9];
  for (let i = 0; i < m.color.length; i++) {
    const v = m.color[i];
    if (!Number.isFinite(v) || v < -1e-6 || v > 1 + 1e-6) { colBad++; }
    const c = i % 3;
    if (v < colMin[c]) colMin[c] = v;
    if (v > colMax[c]) colMax[c] = v;
  }
  let idxBad = 0;
  for (let i = 0; i < m.index.length; i++) { if (m.index[i] < 0 || m.index[i] >= m.count) { idxBad++; } }
  if (nan) problems.push(name + ': ' + nan + ' 个 NaN 顶点');
  if (colBad) problems.push(name + ': ' + colBad + ' 个越界颜色分量');
  if (idxBad) problems.push(name + ': ' + idxBad + ' 个越界索引');

  // 动画位移稳定性
  let aNan = 0, maxAbs = 0, maxRho = 0;
  const stride = Math.max(1, Math.floor(m.count / 900));
  for (let i = 0; i < m.count; i += stride) {
    const i3 = i * 3;
    const r = V.transformVertex(m.position[i3], m.position[i3 + 1], m.position[i3 + 2],
      m.normal[i3], m.normal[i3 + 1], m.normal[i3 + 2], m.seed[i], m.param[i], uni,
      [m.animC[i3], m.animC[i3 + 1], m.animC[i3 + 2]], [m.animT[i3], m.animT[i3 + 1], m.animT[i3 + 2]]);
    if (!Number.isFinite(r.x) || !Number.isFinite(r.y) || !Number.isFinite(r.z) ||
        !Number.isFinite(r.nx) || !Number.isFinite(r.ny) || !Number.isFinite(r.nz)) { aNan++; }
    const rr = Math.hypot(r.x, r.y, r.z);
    if (rr > maxAbs) maxAbs = rr;
  }
  if (aNan) problems.push(name + ': 动画位移产生 ' + aNan + ' 个非有限值');

  return {
    name, verts: m.count, tris: m.index.length / 3, nan, idxBad, colBad,
    minR, maxR, bbox, colMin: colMin.map(v => +v.toFixed(3)), colMax: colMax.map(v => +v.toFixed(3)),
    maxAbs: +maxAbs.toFixed(3)
  };
}

/* --------------------------- 相机 --------------------------- */
function makeCamera(modeName, W, H, yawOverride, pitchOverride, fovOverride) {
  const info = V.MODES[modeName] || V.MODES.tube;
  const cam = {
    yaw: yawOverride !== null ? yawOverride : info.cam.yaw,
    pitch: pitchOverride !== null ? pitchOverride : info.cam.pitch,
    zoom: info.cam.zoom,
    target: info.cam.target.slice()
  };
  const FOV = (fovOverride !== null ? fovOverride : 24) * Math.PI / 180;
  const aspect = W / H;
  const tanHalf = Math.tan(FOV * 0.5);
  const base = Math.max(1.06 / tanHalf, 0.94 / (aspect * tanHalf));
  const dist = base * cam.zoom;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const eye = [
    cam.target[0] + dist * cp * Math.sin(cam.yaw),
    cam.target[1] + dist * sp,
    cam.target[2] + dist * cp * Math.cos(cam.yaw)
  ];
  const proj = V.mat4.perspective(V.mat4.create(), FOV, aspect, 0.05, 60);
  const view = V.mat4.lookAt(V.mat4.create(), eye, cam.target, [0, 1, 0]);
  return { eye, vp: V.mat4.multiply(V.mat4.create(), proj, view), dist };
}

/* --------------------------- 光栅化 --------------------------- */
function renderScene(scene, cam, W, H, time, morphAmt) {
  const rgb = new Float32Array(W * H * 3).fill(1);
  const zbuf = new Float32Array(W * H).fill(Infinity);
  const uni = {
    time: time, swirl: scene.modeInfo.anim.swirl, inward: scene.modeInfo.anim.inward,
    stretch: scene.modeInfo.anim.stretch, rhoMax: scene.modeInfo.anim.rhoMax, animate: 1
  };
  const flow = 0.34;

  function draw(mesh, lit, animate) {
    const n = mesh.count;
    const sx = new Float64Array(n), sy = new Float64Array(n), sw = new Float64Array(n);
    const wx = new Float64Array(n), wy = new Float64Array(n), wz = new Float64Array(n);
    const nx = new Float64Array(n), ny = new Float64Array(n), nz = new Float64Array(n);
    const u = Object.assign({}, uni, { animate: animate });
    const useMorph = mesh.morphPosition && morphAmt > 0;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      let px = mesh.position[i3], py = mesh.position[i3 + 1], pz = mesh.position[i3 + 2];
      let vnx = mesh.normal[i3], vny = mesh.normal[i3 + 1], vnz = mesh.normal[i3 + 2];
      if (useMorph) {   // 与 GLSL 里的 mix 一致
        px = px + (mesh.morphPosition[i3] - px) * morphAmt;
        py = py + (mesh.morphPosition[i3 + 1] - py) * morphAmt;
        pz = pz + (mesh.morphPosition[i3 + 2] - pz) * morphAmt;
        vnx = vnx + (mesh.morphNormal[i3] - vnx) * morphAmt;
        vny = vny + (mesh.morphNormal[i3 + 1] - vny) * morphAmt;
        vnz = vnz + (mesh.morphNormal[i3 + 2] - vnz) * morphAmt;
      }
      const t = V.transformVertex(px, py, pz, vnx, vny, vnz, mesh.seed[i], mesh.param[i], u,
        [mesh.animC[i3], mesh.animC[i3 + 1], mesh.animC[i3 + 2]],
        [mesh.animT[i3], mesh.animT[i3 + 1], mesh.animT[i3 + 2]]);
      wx[i] = t.x; wy[i] = t.y; wz[i] = t.z; nx[i] = t.nx; ny[i] = t.ny; nz[i] = t.nz;
      const vp = cam.vp;
      const cx = vp[0] * t.x + vp[4] * t.y + vp[8] * t.z + vp[12];
      const cy = vp[1] * t.x + vp[5] * t.y + vp[9] * t.z + vp[13];
      const cw = vp[3] * t.x + vp[7] * t.y + vp[11] * t.z + vp[15];
      sw[i] = cw;
      sx[i] = (cx / cw * 0.5 + 0.5) * W;
      sy[i] = (1 - (cy / cw * 0.5 + 0.5)) * H;
    }
    const idx = mesh.index;
    for (let f = 0; f < idx.length; f += 3) {
      const a = idx[f], b = idx[f + 1], c = idx[f + 2];
      if (sw[a] <= 0.05 || sw[b] <= 0.05 || sw[c] <= 0.05) { continue; }
      const ax = sx[a], ay = sy[a], bx = sx[b], by = sy[b], cxp = sx[c], cyp = sy[c];
      const area = (bx - ax) * (cyp - ay) - (by - ay) * (cxp - ax);
      if (Math.abs(area) < 1e-9) { continue; }
      const minX = Math.max(0, Math.floor(Math.min(ax, bx, cxp)));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cxp)));
      const minY = Math.max(0, Math.floor(Math.min(ay, by, cyp)));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(ay, by, cyp)));
      if (minX > maxX || minY > maxY) { continue; }
      if ((maxX - minX + 1) * (maxY - minY + 1) > 260000) { continue; }

      const w0 = 1 / sw[a], w1 = 1 / sw[b], w2 = 1 / sw[c];
      const c0 = mesh.color[a * 3], c1 = mesh.color[a * 3 + 1], c2 = mesh.color[a * 3 + 2];
      const d0 = mesh.color[b * 3], d1 = mesh.color[b * 3 + 1], d2 = mesh.color[b * 3 + 2];
      const e0 = mesh.color[c * 3], e1 = mesh.color[c * 3 + 1], e2 = mesh.color[c * 3 + 2];
      const p0 = mesh.param[a], p1 = mesh.param[b], p2 = mesh.param[c];
      const s0 = mesh.seed[a], s1 = mesh.seed[b], s2 = mesh.seed[c];

      const inv = 1 / area;
      for (let y = minY; y <= maxY; y++) {
        const py = y + 0.5;
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5;
          const l0 = ((bx - px) * (cyp - py) - (by - py) * (cxp - px)) * inv;
          const l1 = ((cxp - px) * (ay - py) - (cyp - py) * (ax - px)) * inv;
          const l2 = 1 - l0 - l1;
          if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) { continue; }
          const denom = l0 * w0 + l1 * w1 + l2 * w2;
          const g0 = l0 * w0 / denom, g1 = l1 * w1 / denom, g2 = l2 * w2 / denom;
          const depth = g0 * sw[a] + g1 * sw[b] + g2 * sw[c];
          const zi = y * W + x;
          if (depth >= zbuf[zi]) { continue; }
          zbuf[zi] = depth;

          const pxc = g0 * wx[a] + g1 * wx[b] + g2 * wx[c];
          const pyc = g0 * wy[a] + g1 * wy[b] + g2 * wy[c];
          const pzc = g0 * wz[a] + g1 * wz[b] + g2 * wz[c];
          const nxc = g0 * nx[a] + g1 * nx[b] + g2 * nx[c];
          const nyc = g0 * ny[a] + g1 * ny[b] + g2 * ny[c];
          const nzc = g0 * nz[a] + g1 * nz[b] + g2 * nz[c];
          const col = [
            g0 * c0 + g1 * d0 + g2 * e0,
            g0 * c1 + g1 * d1 + g2 * e1,
            g0 * c2 + g1 * d2 + g2 * e2
          ];
          let out;
          if (lit) {
            const param = g0 * p0 + g1 * p1 + g2 * p2;
            const seed = g0 * s0 + g1 * s1 + g2 * s2;
            out = V.shadePixel(col, nxc, nyc, nzc, pxc, pyc, pzc, cam.eye, flow, param, seed, time);
          } else {
            out = col;
          }
          rgb[zi * 3] = out[0]; rgb[zi * 3 + 1] = out[1]; rgb[zi * 3 + 2] = out[2];
        }
      }
    }
  }

  draw(scene.filaments, true, 1);
  if (scene.axis) { draw(scene.axis, false, 0); }
  return rgb;
}

/* --------------------------- PNG --------------------------- */
function crc32(buf) {
  let c, crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xFF;
    for (let k = 0; k < 8; k++) { c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; }
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, w, h, floats) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 3, di = y * (w * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) {
        raw[di + k] = Math.round(Math.max(0, Math.min(1, floats[si + k])) * 255);
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]));
}
function blit(dst, dstW, dstH, ox, oy, src, sw2, sh2) {
  for (let y = 0; y < sh2; y++) {
    const ty = oy + y;
    if (ty < 0 || ty >= dstH) { continue; }
    for (let x = 0; x < sw2; x++) {
      const tx = ox + x;
      if (tx < 0 || tx >= dstW) { continue; }
      const si = (y * sw2 + x) * 3, di = (ty * dstW + tx) * 3;
      dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2];
    }
  }
}

/* --------------------------- 主流程 --------------------------- */
const t0 = Date.now();
const report = [];
const CELL = 470, COLS = 3;
const sheet = MODE === 'sheet';
let sheetBuf = null, sheetW = 0, sheetH = 0;

const modes = sheet ? V.MODE_ORDER : [MODE];
if (sheet) {
  const rows = Math.ceil(modes.length / COLS);
  sheetW = CELL * COLS; sheetH = CELL * rows;
  sheetBuf = new Float32Array(sheetW * sheetH * 3).fill(1);
}

modes.forEach(function (modeName, mi) {
  const info = V.MODES[modeName];
  if (!info) { throw new Error('未知情形: ' + modeName); }
  const scene = V.buildScene({ mode: modeName, density: DENSITY, seed: 20260214 });
  const morphAmt = MORPH !== null ? MORPH : (info.morph ? info.morph.def : 0);

  const uni = {
    time: TIME, swirl: info.anim.swirl, inward: info.anim.inward,
    stretch: info.anim.stretch, rhoMax: info.anim.rhoMax, animate: 1
  };
  const rep = [checkMesh('filaments', scene.filaments, uni)];
  if (scene.axis) { rep.push(checkMesh('axis', scene.axis, { time: TIME, animate: 0, rhoMax: info.anim.rhoMax, swirl: 0, inward: 0, stretch: 0 })); }
  report.push({ mode: modeName, name: info.name, stats: scene.stats, hasMorph: scene.hasMorph, morphAmt, meshes: rep });

  const W = sheet ? CELL : 660, H = sheet ? CELL : 660;
  const cam = makeCamera(modeName, W, H,
    process.argv[6] !== undefined ? parseFloat(process.argv[6]) : null,
    process.argv[7] !== undefined ? parseFloat(process.argv[7]) : null,
    null);
  const t1 = Date.now();
  const rgb = renderScene(scene, cam, W, H, TIME, morphAmt);
  const ms = Date.now() - t1;
  report[report.length - 1].rasterMs = ms;

  if (sheet) {
    const ox = (mi % COLS) * CELL, oy = Math.floor(mi / COLS) * CELL;
    blit(sheetBuf, sheetW, sheetH, ox, oy, rgb, W, H);
  } else {
    writePNG(OUT, W, H, rgb);
  }
});

if (sheet) { writePNG(OUT, sheetW, sheetH, sheetBuf); }

report.forEach(function (r) {
  const f = r.meshes[0];
  console.log('[' + r.mode + '] ' + r.name + (r.hasMorph ? '（形变 ' + r.morphAmt + '）' : ''));
  console.log('   细丝 ' + r.stats.filaments + ' 条 · 顶点 ' + r.stats.vertices + ' · 三角形 ' + r.stats.triangles +
    ' · 光栅 ' + r.rasterMs + ' ms');
  r.meshes.forEach(function (m) {
    console.log('   ' + m.name + ': 半径 ' + m.minR.toFixed(3) + '..' + m.maxR.toFixed(3) +
      ' 包围盒 x[' + m.bbox[0][0].toFixed(2) + ',' + m.bbox[0][1].toFixed(2) + '] y[' + m.bbox[1][0].toFixed(2) + ',' + m.bbox[1][1].toFixed(2) +
      '] z[' + m.bbox[2][0].toFixed(2) + ',' + m.bbox[2][1].toFixed(2) + ']' +
      ' 颜色 max ' + JSON.stringify(m.colMax) + ' 动画最大坐标 ' + m.maxAbs);
  });
});
console.log('\n总耗时 ' + (Date.now() - t0) + ' ms');
console.log('问题: ' + (problems.length ? '\n  - ' + problems.join('\n  - ') : '无'));
console.log('输出: ' + OUT);
