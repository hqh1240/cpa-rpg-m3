# CPA_RPG M3 部署说明

## 推荐方式

1. 在项目目录运行：

```powershell
npm run build
```

2. 将 `release/cpa_rpg_m3_web` 整个目录上传到静态托管服务。

## 推荐托管

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- 任意支持静态文件的 Web 服务器

## 部署要求

- 保持目录结构不变，`index.html` 必须与 `assets/`、`style.css`、`game.js` 等文件在同一层级。
- 使用 HTTPS 部署，避免浏览器对部分本地 API 的限制。
- 更新时直接覆盖文件，并同步更新 `version.json`。

## 本地预览

运行：

```powershell
node tools/serve_release.mjs
```

然后打开 `http://127.0.0.1:8080`。

## 版本更新

- 更新 `game.js` 中的 `GAME_VERSION`
- 更新 `version.json`
- 重新执行 `npm run build`
- 上传覆盖 `release/cpa_rpg_m3_web`
