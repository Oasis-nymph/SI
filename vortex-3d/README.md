# 涡丝 3D 重建（Navier–Stokes 涡量拉伸）

把 OpenAI《Navier–Stokes 问题》配图里的那个漩涡，重建成**可交互的 3D 模型**，并且
**做成了五种不同物理情形**，每种形态、配色、机位、标注都不一样。

▶ **在线预览**：[oasis-nymph.github.io/SI/vortex-3d](https://oasis-nymph.github.io/SI/vortex-3d/)（GitHub Pages 托管，点开即玩）

- 主文件：[index.html](https://github.com/Oasis-nymph/SI/blob/main/vortex-3d/index.html)（自包含，无 CDN、无构建步骤、无外部资源，双击即开）
- 真实浏览器截图：`tools/shots/`（五种情形各一张，无头 Edge 实拍）
- 离线校验器：`tools/render-check.js`（Node 端 CPU 光栅化，无浏览器也能检查几何与配色）
- 页面自检：`tools/_check.js`（语法、DOM id、顶点缓冲完整性、五种情形属性一致性）
- 运行模拟器：`tools/_simulate.js`（Node 版 DOM + WebGL 模拟，抓异常与非法 GL 调用）
- 浏览器探针：`tools/_probe.js` → `_probe.html`（用最简渲染器二分定位绘制问题）
- 浏览器复验脚本：`tools/browser-verify.ps1`（无头 Edge 逐情形截图）
- 效果预览：`tools/preview.png`（拉伸涡管）、`tools/modes.png`（五种情形对照）

## 五种情形

| 情形 | 英文 | 形态 | 看点 |
| --- | --- | --- | --- |
| 拉伸涡管 | stretching vortex tube | 竖直纺锤形涡管，外侧细丝向内盘绕 | 原图重建；琥珀色近轴束 = 轴向拉伸 |
| 扭曲失稳 | kink instability (m=1) | 直涡管弯成螺旋，管心沿程变细 | 弯管外侧被拉伸（琥珀色）；「失稳发展」滑块从直管连续弯到失稳 |
| 涡环 | vortex ring | 大圆涡心 + 极向缠绕的细丝 | 整数圈缠绕 → 真正闭合的涡线；默认机位从斜上方看 |
| 涡重联 | vortex reconnection | 两根反向涡管靠近、拉细、换接 | 「重联进程」滑块/自动演示：拓扑在中间改变 |
| 湍流纠结 | vortex tangle | 多尺度涡管互相缠绕 | 多个尺度并存，曲率大的位置偏青 |

切换情形时，参数（扭转/收缩/拉伸）、标注、以及**机位**都会切到该情形的推荐值，
机位是平滑过渡过去的——但只是默认值，随时可以自由旋转。

## 视角（不锁死）

- 拖拽旋转：**俯仰角可以一直到接近正俯视 / 正仰视**（±88.5°，不再夹在 ±77°）
- 滚轮缩放、右键 / Shift 拖拽平移、双击回到该情形的默认机位
- 「正交投影」开关：在透视与正交之间切换，正交更接近论文配图的观感
- 每个情形可以有自己的默认机位（默认只是起点，不限制你转）
- URL 参数：`?mode=ring` 直接进入某情形，`?still=1` 冻结动画，`?t=3.2` 定格到指定时刻

## 面板参数

- **细丝密度**：细丝条数倍率（0.4–1.8×）
- **螺旋圈数**：每条细丝的缠绕圈数
- **截面形态**：`圆丝 ↔ 扁带`。原图的丝线不是圆电线，而是竖直方向更宽、径向更薄的扁带
- **演化进程**（仅扭曲失稳 / 涡重联）：在「基础态 ↔ 目标态」之间连续形变，可自动来回演示
- **向内收缩**：涡丝向轴心收缩的脉动幅度（*inward spiral*）
- **轴向拉伸**：近轴细丝沿轴向被拉长的幅度（*axial stretching*）
- **扭曲速度**：差速扭转强度（内侧转得比外侧快）
- **播放速度 / 暂停 / 自转 / 流动高光 / 标注 / 轴线 / 正交投影**
- **重新生成**：换一组随机形态（同一套物理规律）；**存图**：导出当前视角 PNG

## 颜色怎么读

- 颜色 = 该处细丝**到「局部涡轴」的距离**（局部涡轴 = 该细丝所绕的那条涡心线）：
  深蓝（涡心内圈）→ 蓝 → 青绿 → 淡青（向外甩出的扫掠丝）
- 琥珀色 = **沿轴被拉伸的细丝**：拉伸涡管里是近轴两束，扭曲失稳里是弯管外侧，
  涡重联里是被拉细的重联区
- 涡重联的两根管用「蓝 / 青」区分，表示环量方向相反

## 物理含义

涡管沿自身轴线被拉长时，角动量守恒迫使流体向轴心收缩、转速加快，涡量随之被放大——
这正是三维 Navier–Stokes 方程里涡量拉伸项 `(ω·∇)u` 的几何图像，也是湍流能量级串、
以及三维解是否会产生奇点这一世纪问题的核心机制。五种情形分别对应这条链条上的不同环节：
拉伸 → 失稳 → 重联 → 纠结。

## 重要说明

这是**示意性重建**，不是论文的原始计算数据。几何由参数化螺旋（分层抽样的低差异序列）生成，
配色与构图对齐配图，用来呈现涡量拉伸的几何直观。引用原文请以
[openai.com/index/navier-stokes-solution](https://openai.com/index/navier-stokes-solution/) 为准。

## 实现要点

- 纯 WebGL（GLSL ES 1.00，WebGL1/2 都可用），不依赖 three.js 等任何库
- **局部涡轴驱动的动画**：每个顶点附带它所属涡心线的点 `aAnimC` 与方向 `aAnimT`，
  顶点着色器据此做「绕局部涡轴的差速扭转 + 向轴收缩 + 沿线拉伸」。
  因此同一套动画能作用于竖直涡管、弯管、涡环、重联管、纠结涡管等所有形态，
  法线也同步按 `1/inward`、`1/yScale` 修正
- 细丝截面是**以涡径为基准的扁带**：截面两轴取「到局部涡轴的径向」与 `T×A`，环带因此贴着涡管柱面；
  截面是椭圆，法线按 `A·cosα/rA + B·sinα/rB` 求
- **形变（morph）**：同一族路径换参数再扫一遍，得到顶点一一对应的「目标态」，
  着色器里 `mix` 插值 —— 所以重联 / 失稳可以连续演示，而不是切模型
- 动画采用**有界的扭转-回弹**而不是无限累积旋转，因此图注锚点始终指向正确位置
- 没有形变数据的网格会**禁用**对应属性数组并用常量代替：WebGL 要求已启用属性数组的缓冲
  必须覆盖全部顶点索引，否则 `drawElements` 会报 INVALID_OPERATION 而整帧不画

## 离线校验

```bash
node tools/_check.js                 # 静态自检：语法 / DOM id / 顶点缓冲完整性 / 五情形属性
node tools/_simulate.js              # 用 Node 版 DOM+WebGL 模拟真跑一遍，抓异常与非法 GL 调用
node tools/render-check.js <out.png> <density> <time> <mode|sheet> [yaw] [pitch] [fov] [morph]
powershell -ExecutionPolicy Bypass -NoProfile -File tools/browser-verify.ps1   # 真实浏览器截图
```

`render-check.js` 把 `index.html` 里 `VORTEX-CORE-BEGIN/END` 之间的纯函数段抽出来，
用与着色器**逐行对应**的 CPU 光栅化器渲染成 PNG，并报告顶点/三角形数、包围盒、半径分布、
颜色范围、索引越界、NaN、动画位移稳定性；`sheet` 会把五种情形排成一张对照图。

`_simulate.js` 会把页面脚本在假 DOM/假 WebGL 里跑起来，校验属性缓冲长度是否满足
`drawElements` 的要求，并把这类错误直接判为失败。

### 曾经踩过的坑（都已修，并加了防回归检查）

1. **画布全白、只有 UI**：重写 `makeMesh` 时漏掉了 `idx: buf(mesh.index, gl.ELEMENT_ARRAY_BUFFER)`，
   导致索引缓冲未绑定，`drawElements` 每次都被判 INVALID_OPERATION（glError 1282）而整帧不画。
   `_check.js` 现在会静态检查 makeMesh/bindMesh 的缓冲项是否齐全，`_simulate.js` 也会把此类问题判为失败。
2. **机位会算出 NaN**：`dt` 原本只夹上限不夹下限，某些浏览器 rAF 时间戳与 `performance.now()`
   时间原点不一致时会出现巨大负值，`Math.pow(0.002, dt)` 溢出成 Infinity，视图矩阵失效、画面全白。
   现在 `dt` 夹在 [0, 0.05]，并且帧循环异常会直接显示在页面上而不是静默白屏。
3. **中文文件被 PowerShell 5.1 改坏**：本机 shell 是 Windows PowerShell 5.1，它读取无 BOM 的 UTF-8
   文件时按 ANSI 解码，`Set-Content` 回写就会把中文变成乱码（脚本还会因此语法报错）。
   因此：文件文本操作一律走 Node；`.ps1` 保持纯 ASCII。

当前状态（density=1.0）：拉伸涡管 382 条细丝、26.5 万顶点、52.4 万三角形，构建约 0.17 s；
涡环最大约 16.5 万顶点；五种情形在无头 Edge（SwiftShader）中均已实拍确认渲染成功，
无 NaN、无索引越界、无非法 GL 调用。
