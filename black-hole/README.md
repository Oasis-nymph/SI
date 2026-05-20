# Black Hole Accretion Disk — 黑洞吸积盘三维可视化

A 3D WebGL visualization of a **Schwarzschild black hole** with a rotating accretion disk, photon ring, and gravitational lensing effects. Matter spirals inward on Keplerian orbits — the inner disk glows blue-white at millions of degrees, while the outer region cools to red-orange. Light from the far side of the disk is bent around the event horizon, forming a ghostly lensing arc above.

**史瓦西黑洞**的三维 WebGL 可视化，包含旋转吸积盘、光子环和引力透镜效应。物质沿开普勒轨道螺旋下落——内区数百万度高温呈蓝白色，外区逐渐冷却为红橙色。盘背后方的光被引力弯曲，在事件视界上方形成幽灵般的透镜光弧。

[**Live Demo / 在线演示**](https://<username>.github.io/<repo>/black-hole/)

## How to use / 使用方法

1. **Online / 在线**: open the GitHub Pages link above / 点开上方链接即可
2. **Local / 本地**: download `index.html` and double-click it / 下载 index.html 双击打开

## Structure / 结构

| Radius | Feature | Description / 描述 |
|:------:|---------|------|
| r = 1.0 R<sub>s</sub> | Event Horizon / 事件视界 | Pure black sphere, point of no return / 纯黑球体，不可返回的边界 |
| r = 1.5 R<sub>s</sub> | Photon Sphere / 光子球 | Unstable circular photon orbits, visible as a bright ring / 不稳定光子圆轨道，呈现为亮环 |
| r = 3.0 R<sub>s</sub> | ISCO / 最内稳定轨道 | Innermost stable circular orbit, inner edge of accretion disk / 吸积盘内缘 |
| r = 3–8 R<sub>s</sub> | Accretion Disk / 吸积盘 | Keplerian orbiting particles with temperature gradient / 开普勒轨道粒子，带温度梯度 |
| — | Lensing Arc / 透镜弧 | Secondary image of the far-side disk, bent by gravity / 盘背面经引力弯曲形成的次级像 |

## The Model / 模型

| Component | Description |
|-----------|-------------|
| **Accretion Disk** | ~7,000 particles on Keplerian orbits (ω ∝ r<sup>−3/2</sup>). Temperature-coded: blue-white (inner, ~10<sup>7</sup> K) → yellow-white (mid) → red-orange (outer, ~3,000 K). Spiral density structure and flared disk thickness. |
| **Photon Ring** | Two concentric thin tori at r = 1.5 R<sub>s</sub>, representing the photon sphere where light can orbit the black hole. The inner ring is bright; the outer ring is fainter, corresponding to higher-order lensed images. |
| **Gravitational Lensing Arc** | ~2,500 particles above the black hole at heights h ≈ 0.75√(r² − 1.5²). These represent light from behind the disk bent around the event horizon — the secondary image predicted by general relativity. |
| **Corona** | ~400 hot particles scattered near the event horizon, representing the X-ray corona observed in many black hole systems. |
| **Starfield** | 2,000 background stars on a large sphere for spatial context. |

## Features / 功能

- 3D WebGL rendering with **bloom post-processing** — accretion disk glows intensely / 三维 WebGL + **泛光后处理**，吸积盘炽热发光
- **Keplerian orbital dynamics** — inner particles orbit faster (ω ∝ r<sup>−3/2</sup>) / **开普勒轨道动力学**，内区粒子旋转更快
- **Temperature gradient** — color-coded from blue-white (hot) to red-orange (cool) / **温度梯度**着色，蓝白（高温）到红橙（低温）
- **Gravitational lensing simulation** — ghost arc of particles above the event horizon / **引力透镜模拟**，事件视界上方的粒子光弧
- **Photon ring** at r = 1.5 R<sub>s</sub> — the unstable photon orbit / **光子环**，r = 1.5 R<sub>s</sub> 处的不稳定光子轨道
- **Corona** — scattered hot particles near the event horizon / **日冕**，事件视界附近的散射高温粒子
- Orbit controls: drag to rotate, scroll to zoom, right-drag to pan / 轨道控制：拖拽旋转、滚轮缩放、右键平移
- Auto-rotate when idle / 静止时自动旋转
- **Top View** button — animated transition to face-on disk view / **俯视**按钮，动画过渡到盘面正上方视角
- Starfield background / 星场背景
- Built-in documentation panel (structure, physics, lensing) / 内嵌详细介绍文档
- Bilingual UI: Chinese (default) / English toggle / 中英文双语界面
- Keyboard shortcuts: Space = pause/play, R = reset, T = top view / 键盘快捷键
- Responsive layout for desktop & mobile / 响应式布局
- **Single HTML file** — zero dependencies, zero build / **单 HTML 文件**，零依赖，零构建

## Deploy to GitHub Pages / 部署

1. Push this folder to a GitHub repo / 推送文件夹到 GitHub 仓库
2. Settings → Pages → Source: `main` branch, root → Save / 设置 Pages 选 main 分支根目录保存
3. Visit / 访问 `https://<username>.github.io/<repo>/black-hole/`

---

Created by **BW** | Black Hole Accretion Disk — Schwarzschild 1916, EHT 2019
