/*
 * _check.js — index.html 静态与结构自检
 *  1) 所有 <script> 块的语法
 *  2) getElementById 引用的 id 是否都在 HTML 里存在
 *  3) 五种情形的顶点属性完整性（着色器/上传代码依赖这些数组）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let bad = 0;

/* 1. 语法 */
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
blocks.forEach((s, i) => {
  try { new Function(s[1]); console.log('语法: block ' + i + ' OK (' + s[1].length + ' 字符)'); }
  catch (e) { console.log('语法: block ' + i + ' 失败 -> ' + e.message); bad++; }
});

/* 2. DOM id */
const ids = [...html.matchAll(/id="([A-Za-z0-9_-]+)"/g)].map(x => x[1]);
const used = [...new Set([...html.matchAll(/getElementById\('([^']+)'\)/g)].map(x => x[1]))];
const missing = used.filter(u => !ids.includes(u));
console.log('DOM id: 定义 ' + ids.length + ' 个, 引用 ' + used.length + ' 个, 缺失: ' + (missing.length ? missing.join(', ') : '无'));
if (missing.length) { bad++; }
const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
console.log('DOM id 重复: ' + (dup.length ? dup.join(', ') : '无'));
if (dup.length) { bad++; }

/* 2b. 网格必须包含全部顶点缓冲（曾经漏掉 idx 导致 drawElements 全帧被拒） */
const meshKeys = ['position', 'normal', 'color', 'seed', 'param', 'animC', 'animT', 'index'];
const requiredBuf = {
  pos: 'position', nrm: 'normal', col: 'color', seed: 'seed',
  par: 'param', anc: 'animC', ant: 'animT', idx: 'index'
};
const mm = html.slice(html.indexOf('function makeMesh'), html.indexOf('function disposeMesh'));
const bufMiss = Object.keys(requiredBuf).filter(k => !new RegExp('\\b' + k + ':').test(mm));
console.log('makeMesh 顶点缓冲: ' + (bufMiss.length ? '★缺少 ' + bufMiss.join(', ') : Object.keys(requiredBuf).length + ' 项齐全'));
if (bufMiss.length) { bad++; }
const bm = html.slice(html.indexOf('function bindMesh'), html.indexOf('/* ---------------- 状态'));
const bindMiss = Object.keys(requiredBuf).filter(k => !new RegExp('m\\.' + k).test(bm));
console.log('bindMesh 绑定: ' + (bindMiss.length ? '★缺少 ' + bindMiss.join(', ') : Object.keys(requiredBuf).length + ' 项齐全'));
if (bindMiss.length) { bad++; }
const coreMiss = meshKeys.filter(k => !new RegExp(k + ':').test(html));
if (coreMiss.length) { console.log('核心输出缺少字段: ★' + coreMiss.join(', ')); bad++; }

/* 3. 五种情形的属性完整性 */
const BEGIN = '/* ==== VORTEX-CORE-BEGIN ==== */', END = '/* ==== VORTEX-CORE-END ==== */';
new Function(html.slice(html.indexOf(BEGIN) + BEGIN.length, html.indexOf(END)))();
const V = globalThis.VortexCore;
const need = ['position', 'normal', 'color', 'seed', 'param', 'animC', 'animT', 'index'];
V.MODE_ORDER.forEach(m => {
  const info = V.MODES[m];
  const problems = [];
  if (!info) { problems.push('未注册'); }
  else {
    ['name', 'en', 'note', 'cam', 'anim', 'labels', 'build'].forEach(k => { if (!info[k]) { problems.push('缺字段 ' + k); } });
    try {
      const sc = V.buildScene({ mode: m, density: 0.5, seed: 20260214 });
      need.forEach(k => { if (!sc.filaments[k]) { problems.push('缺属性 ' + k); } });
      ['position', 'normal', 'color', 'animC', 'animT'].forEach(k => {
        if (sc.filaments[k] && sc.filaments[k].length !== sc.filaments.count * 3) {
          problems.push(k + ' 长度不等 (' + sc.filaments[k].length + ' vs ' + sc.filaments.count * 3 + ')');
        }
      });
      ['seed', 'param'].forEach(k => {
        if (sc.filaments[k] && sc.filaments[k].length !== sc.filaments.count) {
          problems.push(k + ' 长度不等');
        }
      });
      if (sc.filaments.morphPosition && sc.filaments.morphPosition.length !== sc.filaments.count * 3) {
        problems.push('morphPosition 长度不等');
      }
      if (sc.filaments.morphNormal && sc.filaments.morphNormal.length !== sc.filaments.count * 3) {
        problems.push('morphNormal 长度不等');
      }
      if (info.morph && !sc.filaments.morphPosition) { problems.push('声明了形变但没有 morph 数据'); }
      let maxIdx = 0;
      for (let i = 0; i < sc.filaments.index.length; i++) { if (sc.filaments.index[i] > maxIdx) { maxIdx = sc.filaments.index[i]; } }
      if (maxIdx >= sc.filaments.count) { problems.push('索引越界 ' + maxIdx); }
      console.log('情形 ' + m + ' (' + info.name + '): 细丝 ' + sc.stats.filaments + ' · 顶点 ' + sc.stats.vertices +
        ' · 形变 ' + (sc.hasMorph ? '有' : '无') + (problems.length ? '  [' + problems.join('; ') + ']' : '  OK'));
    } catch (e) { problems.push('构建异常 ' + e.message); }
  }
  if (problems.length) { bad++; }
  if (info && info.labels) {
    info.labels.forEach(L => {
      if (!L.text || !L.zh || !L.anchor || !L.pos || !L.pos.left || !L.pos.top) {
        console.log('  标注字段不全: ' + JSON.stringify(L)); bad++;
      }
    });
  }
});

console.log(bad ? '\n发现 ' + bad + ' 类问题' : '\n全部通过');
process.exit(bad ? 1 : 0);
