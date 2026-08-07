# CPA_RPG 工程架构

## 目录结构

```text
CPA_RPG_M2_Demo/
  src/
    main.js               # 构建入口
    game.js               # 游戏引擎主模块（当前仍为单体，后续继续拆分）
    core/
      config.js           # 版本、存档键、系统解锁等级等配置
      utils.js            # 日期、周次、时长等工具函数
    data/
      achievements.js
      questions.js        # 构建时由 tools/build_data_module.mjs 生成
      regionTasks.js
    systems/
      achievements.js     # 成就解锁与奖励
      audio.js            # 音效、BGM、WebAudio
      playerGrowth.js     # 升级、称号、伙伴经验
      quests.js           # 任务进度与交付
      quiz.js             # 抽题、洗牌、判题、限时
      save.js             # localStorage 存档
    render/
      battle.js           # 战斗面板、技能选择、道具选择
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

`npm test` 会先重新构建，再执行 `file://` 冒烟测试和 PWA 离线测试。

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

1. 将战斗结算、答题结果、学习记录继续拆到独立系统模块。
2. 将地图、主界面、战斗以外的 UI 渲染拆到 `src/render/`。
3. 增加类型检查、Lint、单元测试和 CI 自动部署。
