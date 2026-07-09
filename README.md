# Solar System Demo

一个独立的 3D 太阳系科普网站 Demo，面向青少年科普、学校展示、公众科普展厅和交互原型演示场景。

项目重点是把“太阳系科普网站”做成具有沉浸感的动态 3D 星图，而不是普通百科页面。首页和总览页使用 Three.js 渲染太阳、八大行星、轨道、小行星带和星空背景，并支持行星公转、自转、镜头聚焦和 HUD 数据面板。

## 功能亮点

- 全屏 3D Hero：太阳发光、行星沿轨道运行、星空粒子漂浮。
- 太阳系总览：支持拖拽旋转视角、滚轮缩放、点击行星聚焦。
- 行星运动系统：每颗行星拥有独立的轨道半径、公转速度、自转速度、大小和倾角。
- 交互控制：播放/暂停、速度倍率、显示/隐藏轨道、显示/隐藏标签、自动巡航。
- 行星图鉴：玻璃拟态卡片、行星标签、关键科普信息和详情入口。
- 行星详情：每颗行星拥有独立的 3D 主视觉、核心数据、科普介绍和探索任务。
- 科幻 HUD 视觉：深空黑、星云蓝、科技青、太阳金、扫描线、发光边框。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Vue Router
- Three.js
- Tailwind CSS
- lucide-vue-next

## 提示词文档

仓库已加入团队协作用提示词文档：[PROMPTS.md](./PROMPTS.md)。

文档包含两类可直接复制使用的提示词：

- Product Design 提示词：用于生成太阳系科普网站的产品方案、信息架构、3D 科幻视觉规范和交互设计。
- Codex 开发提示词：用于指导 Codex 基于设计方案开发独立的可运行前端 Demo。

同时包含交付检查清单，方便同事按页面、3D 效果、工程结构和 GitHub 仓库边界进行验收。

## 页面

- `/solar`：首页 3D Hero
- `/solar/overview`：太阳系 3D 总览
- `/solar/planets`：行星图鉴
- `/solar/planet/:id`：行星详情页

支持的行星 ID：

- `mercury`
- `venus`
- `earth`
- `mars`
- `jupiter`
- `saturn`
- `uranus`
- `neptune`

## 本地运行

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:5173/solar
```

## 构建

```bash
npm run build
```

构建产物会输出到 `dist/`。

## 目录结构

```text
solar-system-demo/
├─ src/
│  ├─ assets/solar/          # 太阳系图片素材
│  ├─ components/solar/      # 3D 太阳系组件
│  ├─ data/solar.ts          # 行星科普数据
│  ├─ layout/SolarLayout.vue # 科幻导航与页面壳
│  ├─ router/                # 路由配置
│  ├─ styles/                # 全局样式与太阳系视觉样式
│  └─ views/solar/           # 首页、总览、图鉴、详情页
├─ index.html
├─ package.json
└─ vite.config.ts
```
