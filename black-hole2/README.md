# Black Hole Accretion Disk — 黑洞吸积盘三维可视化

A 3D WebGL visualization of a **Schwarzschild black hole** with a continuous accretion disk, photon ring, gravitational lensing arcs, bright knots, and infalling matter — inspired by NASA Goddard's black hole visualizations. Matter spirals inward on Keplerian orbits; the inner disk glows blue-white at millions of degrees, while differential rotation shears bright knots into alternating light and dark lanes.

**史瓦西黑洞**的三维 WebGL 可视化——连续吸积盘、光子环、引力透镜光弧、亮结形成与消散、螺旋坠入物质与渐变尾迹。灵感来源于 NASA 戈达德航天中心的黑洞可视化。物质沿开普勒轨道螺旋下落，内区数百万度蓝白光芒，差速旋转将亮结拉伸剪切为明暗交替的光带。

[**Live Demo / 在线演示**](https://<username>.github.io/<repo>/black-hole/)

## How to use / 使用方法

1. **Online / 在线**: open the GitHub Pages link above / 点开上方链接即可
2. **Local / 本地**: download `index.html` and double-click it / 下载 index.html 双击打开

## Structure / 结构

| Radius | Feature | Description / 描述 |
|:------:|---------|------|
| r = 1.0 R<sub>s</sub> | Event Horizon / 事件视界 | Pure black sphere, point of no return / 纯黑球体，不可返回的边界 |
| r ≈ 2.0 R<sub>s</sub> | Black Hole Shadow / 黑洞阴影 | Dark region ~2× the event horizon / 约为视界两倍大小的暗区 |
| r = 1.5 R<sub>s</sub> | Photon Ring / 光子环 | 3 concentric thin rings — light orbiting before escape / 三层同心细环——逃逸前绕转的光 |
| r = 3–8 R<sub>s</sub> | Accretion Disk / 吸积盘 | 28 concentric glowing rings with temperature gradient / 28 层同心光环，温度梯度着色 |
| — | Doppler Halves / 多普勒半环 | Left half brighter (approaching), right half dimmer (receding) / 左半亮（趋近），右半暗（远离） |
| — | Lensing Arc / 透镜弧 | 10 ghost rings above — secondary image from bent light / 上方 10 层幽灵光环——光线弯曲的次级像 |
| — | Bright Knots / 亮结 | ~45 white-hot flares forming and dissipating / ~45 个白热耀斑不断形成与消散 |
| — | Infalling Matter / 坠入物质 | ~15 objects with glowing gradient trails spiraling inward / ~15 个带渐变尾迹的物体螺旋坠入 |

## Features / 功能

- **Continuous disk** — 28 overlapping concentric tori, not discrete particles / **连续吸积盘** — 28 层重叠同心环面，非离散粒子
- **Doppler beaming** — each ring split into bright (approaching) and dim (receding) halves / **多普勒效应** — 每环分为亮半环（趋近）和暗半环（远离）
- **Temperature gradient** — blue-white inner → yellow-white mid → red-orange outer / **温度梯度** — 蓝白内区 → 黄白中区 → 红橙外区
- **Differential rotation** — inner rings orbit faster (Keplerian ω ∝ r<sup>−3/2</sup>) / **差速旋转** — 内环快于外环（开普勒 ω ∝ r<sup>−3/2</sup>）
- **Photon ring** — 3 concentric bright rings at photon sphere, progressively fainter / **光子环** — 光子球处 3 层同心亮环，逐层变暗
- **Black hole shadow** — dark region ~2× event horizon, matching EHT observations / **黑洞阴影** — 约视界 2 倍的暗区，符合 EHT 观测
- **Gravitational lensing arcs** — 10 ghost rings at computed heights h ≈ 0.72√(r² − 1.5²) / **引力透镜光弧** — 10 层幽灵光环，高度由透镜公式计算
- **Bright knots** — white-hot flares brighten, persist, then fade (rise→hold→fade lifecycle) / **亮结** — 白热耀斑经历增亮→持续→消退的生命周期
- **Infalling matter** — objects with additive-blended gradient trails, accelerating as they approach ISCO / **坠入物质** — 带叠加渐变尾迹的物体，越靠近 ISCO 加速越快
- **Lensed starfield** — ring of background stars near the shadow, simulating weak lensing / **透镜星场** — 阴影附近环形分布背景恒星，模拟弱引力透镜
- Orbit controls: drag to rotate, scroll to zoom, right-drag to pan / 轨道控制
- Auto-rotate when idle / 静止自动旋转
- **Top View** animated transition / **俯视**动画过渡
- Bloom post-processing for realistic glow / Bloom 泛光后处理
- Built-in documentation panel / 内嵌详细介绍文档
- Bilingual UI: Chinese (default) / English toggle / 中英文双语
- Keyboard shortcuts: Space = pause, R = reset, T = top view / 键盘快捷键
- Responsive layout / 响应式布局
- **Single HTML file** — zero dependencies, zero build / **单 HTML 文件**，零依赖，零构建

## Deploy to GitHub Pages / 部署

1. Push this folder to a GitHub repo / 推送文件夹到 GitHub 仓库
2. Settings → Pages → Source: `main` branch, root → Save
3. Visit / 访问 `https://<username>.github.io/<repo>/black-hole/`

---

Created by **BW** | Inspired by NASA Goddard — Jeremy Schnittman / EHT 2019
