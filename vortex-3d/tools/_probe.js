/*
 * _probe.js — 生成 tools/_probe.html：用最小渲染器把同一份几何画出来，用来二分定位“画布空白”
 *
 * 参数（URL）：
 *   ?shader=min   仅 MVP，不做任何顶点位移（默认）
 *   ?shader=disp  完整的局部涡轴位移 + 光照（与 index.html 一致）
 *   ?shader=quad  不用任何 attribute，只画一个铺满屏幕的三角形（管线自检）
 *   ?cull=1       开启背面剔除
 *   ?density=0.3  细丝密度
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const B = '/* ==== VERTEX-VORTEX-CORE-BEGIN ==== */';
const B2 = '/* ==== VORTEX-CORE-BEGIN ==== */', E2 = '/* ==== VORTEX-CORE-END ==== */';
const core = html.slice(html.indexOf(B2), html.indexOf(E2) + E2.length);

const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>probe</title>
<style>html,body{margin:0;background:#fff}canvas{display:block}</style></head>
<body>
<canvas id="gl" width="760" height="760"></canvas>
<div id="out" style="position:fixed;left:8px;top:8px;font:12px monospace;color:#333;white-space:pre"></div>
<script>
${core}
</script>
<script>
(function () {
  'use strict';
  var V = window.VortexCore;
  var q = new URLSearchParams(location.search);
  var SHADER = q.get('shader') || 'min';
  var CULL = q.get('cull') === '1';
  var DENSITY = q.get('density') ? parseFloat(q.get('density')) : 0.3;
  var out = document.getElementById('out');
  var log = [];
  function say(s) { log.push(s); out.textContent = log.join('\\n'); }

  var canvas = document.getElementById('gl');
  var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) { say('NO WEBGL'); return; }
  say('ctx: ' + (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl1'));
  var dbg = gl.getExtension('WEBGL_debug_renderer_info');
  if (dbg) { say('renderer: ' + gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)); }
  say('MAX_VERTEX_ATTRIBS: ' + gl.getParameter(gl.MAX_VERTEX_ATTRIBS));

  var PROJ_NEED = ['aPos'];
  var VERT_MIN = [
    'attribute vec3 aPos;',
    'attribute vec3 aColor;',
    'uniform mat4 uProj;', 'uniform mat4 uView;',
    'varying vec3 vColor;',
    'void main() { vColor = aColor; gl_Position = uProj * uView * vec4(aPos, 1.0); }'
  ].join('\\n');

  var VERT_QUAD = [
    'attribute vec2 aXY;',
    'void main() { gl_Position = vec4(aXY, 0.0, 1.0); }'
  ].join('\\n');

  var VERT_DISP = [
    'attribute vec3 aPos;', 'attribute vec3 aNormal;', 'attribute vec3 aColor;',
    'attribute vec3 aAnimC;', 'attribute vec3 aAnimT;',
    'attribute vec3 aMorphPos;', 'attribute vec3 aMorphNrm;',
    'attribute float aSeed;', 'attribute float aParam;',
    'uniform mat4 uProj;', 'uniform mat4 uView;',
    'uniform float uTime;', 'uniform float uSwirl;', 'uniform float uInward;',
    'uniform float uStretch;', 'uniform float uAnimate;', 'uniform float uRhoMax;',
    'uniform float uMorph;', 'uniform float uMorphAmt;',
    'varying vec3 vColor;', 'varying vec3 vNormalW;', 'varying vec3 vPosW;',
    'varying float vParam;', 'varying float vSeed;',
    'void main() {',
    '  vec3 p = aPos; vec3 nIn = aNormal;',
    '  if (uMorph > 0.5) { p = mix(aPos, aMorphPos, uMorphAmt); nIn = mix(aNormal, aMorphNrm, uMorphAmt); }',
    '  vec3 A = normalize(aAnimT);',
    '  vec3 rel = p - aAnimC;',
    '  float along = dot(rel, A);',
    '  vec3 perp = rel - A * along;',
    '  float rho = length(perp);',
    '  float rhoN = clamp(rho / max(0.0001, uRhoMax), 0.0, 1.0);',
    '  float seedPh = aSeed * 6.28318531;',
    '  float spin = uSwirl * (1.15 * sin(uTime * 0.35 + seedPh * 0.25) + 0.45 * sin(uTime * 0.19)) * (0.30 + 1.25 * (1.0 - rhoN)) * uAnimate;',
    '  float inwardA = 1.0 - uInward * 0.16 * (0.45 + 0.55 * sin(uTime * 0.5 + seedPh)) * (0.35 + 0.65 * rhoN);',
    '  float inward = mix(1.0, inwardA, uAnimate);',
    '  float stretchPulse = 0.55 + 0.45 * sin(uTime * 0.42 + seedPh * 0.7);',
    '  float yScaleA = 1.0 + uStretch * 0.30 * stretchPulse * (1.0 - rhoN) * (1.0 - rhoN);',
    '  float yScale = mix(1.0, yScaleA, uAnimate);',
    '  float cs = cos(spin); float sn = sin(spin);',
    '  vec3 perpR = perp * cs + cross(A, perp) * sn;',
    '  vec3 disp = aAnimC + perpR * inward + A * (along * yScale);',
    '  vPosW = disp; vNormalW = normalize(nIn); vColor = aColor; vParam = aParam; vSeed = aSeed;',
    '  gl_Position = uProj * uView * vec4(disp, 1.0);',
    '}'
  ].join('\\n');

  var FRAG_LIT = [
    'precision highp float;',
    'varying vec3 vColor; varying vec3 vNormalW; varying vec3 vPosW;',
    'uniform vec3 uCam;',
    'void main() {',
    '  vec3 N = normalize(vNormalW);',
    '  vec3 L = normalize(vec3(-0.45, 0.72, 0.53));',
    '  float d = max(dot(N, L), 0.0);',
    '  gl_FragColor = vec4(vColor * (0.35 + 0.75 * d), 1.0);',
    '}'
  ].join('\\n');

  var FRAG_FLAT = 'precision highp float;\\nvarying vec3 vColor;\\nvoid main(){ gl_FragColor = vec4(vColor,1.0); }';

  function sh(type, src, tag) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { say('★' + tag + ' 编译失败: ' + gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function prog(vs, fs, tag) {
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { say('★' + tag + ' 链接失败: ' + gl.getProgramInfoLog(p)); return null; }
    return p;
  }

  var scene = V.buildScene({ mode: q.get('mode') || 'tube', density: DENSITY });
  say('几何: 顶点 ' + scene.filaments.count + ' · 三角形 ' + scene.filaments.index.length / 3);

  var isMesh = SHADER !== 'quad';
  var vsSrc = SHADER === 'disp' ? VERT_DISP : (SHADER === 'quad' ? VERT_QUAD : VERT_MIN);
  var fsSrc = SHADER === 'disp' ? FRAG_LIT : FRAG_FLAT;
  var vs = sh(gl.VERTEX_SHADER, vsSrc, 'vert'), fs = sh(gl.FRAGMENT_SHADER, fsSrc, 'frag');
  if (!vs || !fs) { return; }
  var p = prog(vs, fs, 'prog'); if (!p) { return; }
  gl.useProgram(p);
  say('着色器编译链接: OK (' + SHADER + ', cull=' + (CULL ? 1 : 0) + ')');

  var buf = {};
  function mk(name, data) {
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); buf[name] = b; return b;
  }
  var loc = {};
  ['aPos', 'aColor', 'aNormal', 'aAnimC', 'aAnimT', 'aMorphPos', 'aMorphNrm', 'aSeed', 'aParam'].forEach(function (n) {
    loc[n] = gl.getAttribLocation(p, n);
  });
  say('属性位置: ' + JSON.stringify(loc));

  var idxBuf = null, indexCount = 0;
  if (isMesh) {
    mk('pos', scene.filaments.position); mk('col', scene.filaments.color);
    mk('nrm', scene.filaments.normal); mk('anc', scene.filaments.animC); mk('ant', scene.filaments.animT);
    mk('seed', scene.filaments.seed); mk('par', scene.filaments.param);
    idxBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, scene.filaments.index, gl.STATIC_DRAW);
    indexCount = scene.filaments.index.length;
  } else {
    var qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  }

  var cam = { yaw: 0.15, pitch: 0.02, zoom: 1, target: [0, 0.015, 0] };
  var FOV = 24 * Math.PI / 180, aspect = canvas.width / canvas.height;
  var tan = Math.tan(FOV * 0.5);
  var dist = Math.max(1.06 / tan, 0.94 / (aspect * tan)) * cam.zoom;
  var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  var eye = [cam.target[0] + dist * cp * Math.sin(cam.yaw), cam.target[1] + dist * sp, cam.target[2] + dist * cp * Math.cos(cam.yaw)];
  var proj = V.mat4.perspective(V.mat4.create(), FOV, aspect, 0.05, 60);
  var view = V.mat4.lookAt(V.mat4.create(), eye, cam.target, [0, 1, 0]);
  say('eye=' + eye.map(function (v) { return v.toFixed(2); }).join(',') + ' dist=' + dist.toFixed(2));

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  if (CULL) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }

  function u1(n, v) { var l = gl.getUniformLocation(p, n); if (l) { gl.uniform1f(l, v); } }
  function u3(n, v) { var l = gl.getUniformLocation(p, n); if (l) { gl.uniform3fv(l, v); } }
  function um(n, v) { var l = gl.getUniformLocation(p, n); if (l) { gl.uniformMatrix4fv(l, false, v); } }
  um('uProj', proj); um('uView', view); u3('uCam', eye);
  u1('uTime', 0.0); u1('uSwirl', 1.0); u1('uInward', 1.0); u1('uStretch', 1.0);
  u1('uAnimate', 1.0); u1('uRhoMax', 0.8); u1('uMorph', 0.0); u1('uMorphAmt', 0.0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (!isMesh) {
    var l = gl.getAttribLocation(p, 'aXY');
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    say('已绘制全屏三角形');
  } else {
    function bindA(n, b, size) { var l = loc[n]; if (l >= 0 && b) { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); } }
    bindA('aPos', buf.pos, 3); bindA('aColor', buf.col, 3); bindA('aNormal', buf.nrm, 3);
    bindA('aAnimC', buf.anc, 3); bindA('aAnimT', buf.ant, 3);
    bindA('aSeed', buf.seed, 1); bindA('aParam', buf.par, 1);
    // 形变属性：本探针不提供数据，显式关闭以免缓冲越界
    ['aMorphPos', 'aMorphNrm'].forEach(function (n) {
      var l = loc[n]; if (l >= 0) { gl.disableVertexAttribArray(l); gl.vertexAttrib3f(l, 0, 0, 0); }
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
    var err = gl.getError();
    say('已绘制 ' + indexCount / 3 + ' 三角形, glError=' + err + (err ? ' ★' : ' OK'));
  }
})();
</script>
</body></html>
`;
fs.writeFileSync(path.join(ROOT, 'tools', '_probe.html'), page, 'utf8');
console.log('已生成 tools/_probe.html (' + page.length + ' 字符)');
