# CPA_RPG 工程架构

## 目录结构

```text
cpa-rpg-m3/
  src/
    main.js               # 构建入口
    game.js               # 游戏编排主模块：初始化、状态、交互与系统装配
    core/
      config.js           # 版本、存档键、系统解锁等级等配置
      utils.js            # 日期、周次、时长等工具函数
    data/
      achievements.js
    questions.js          # 构建时由 tools/build_data_module.mjs 生成
      regionTasks.js
    systems/
      achievements.js     # 成就解锁与奖励
      audio.js            # 音效、BGM、WebAudio
      battle.js           # 战斗结算、Boss 机制、胜负逻辑
      economy.js          # 商店、购买、打造、强化
      learning.js         # 答题结果、学习记录、错题收录
      playerGrowth.js     # 升级、称号、伙伴经验
      quests.js           # 任务进度与交付
      quiz.js             # 抽题、洗牌、判题、限时
      save.js             # localStorage 存档
      events.js           # 键盘、鼠标、模态框事件分发
    render/
      battle.js           # 战斗面板、技能选择、道具选择
      characters.js       # 玩家、NPC、怪物绘制
      learningUi.js       # 错题本、学习报告、学习周报
      map.js              # 地图编排、房间渲染
      mapTiles.js         # tileset 底图、建筑、装饰
      panels.js           # 任务、成就、世界地图、职业、伙伴、学习计划
      ui.js               # 弹窗、Toast、标题页、设置面板
  tests/
    smoke.mjs             # file:// 冒烟测试
    pwa.mjs               # PWA 安装与离线测试
  assets/                 # 正式美术、音频、图标
  tools/
    build_game.mjs        # esbuild 打包 src/main.js -> game.js
    build_release.mjs     # 生成 release/cpa_rpg_m3_web
    serve_release.mjs     # 本地静态预览
  index.html              # 入口页面
  questions*.js           # 题目数据源，构建时生成 src/data/questions.js
  release/cpa_rpg_m3_web  # 可直接部署/双击运行的发布包
```

## 构建流程

```powershell
npm install
npm run build
```

`npm run build` 会先由 esbuild 将 `src/main.js` 打包成单个 `game.js`，再生成 `release/cpa_rpg_m3_web` 发布目录。

## 测试

```powershell
npm test
```

`npm test` 会执行单元测试、重新构建、`file://` 冒烟测试和 PWA 离线测试。CI 中执行 `npm run lint`、`npm run unit` 与 `npm run build`。

## 工程检查

```powershell
npm run lint
npm run typecheck
npm run format:check
```

- `lint`：ESLint
- `typecheck`：TypeScript 对核心工具/存档模块做 JSDoc 检查
- `format:check`：Prettier 格式检查

## CI 自动部署

`.github/workflows/deploy.yml` 会在推送到 `main` 后校验 `game.js` 并自动部署 GitHub Pages。

## 本地开发

```powershell
npm run dev
```

该命令会重新构建并启动本地静态服务器，默认访问 `http://127.0.0.1:8080`。

## 兼容性

- 构建产物为普通 `<script>` 加载的 IIFE，不需要模块服务器。
- `file://` 双击 `index.html` 仍可运行。
- PWA 仅在线上 HTTPS 或 localhost 下生效。

## 后续拆分计划

1. 扩展单元测试覆盖率，覆盖系统模块和渲染模块。
2. 增加更严格的类型检查与模块边界测试。
