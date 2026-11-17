# Eumo 网页演示可编辑源码包 v9

这是最新 12 页网页式演示，包含青蛙帽鼹鼠 Focus 场景、黄色 Canele 屏幕版、六色钥匙扣和研究来源。橙色钥匙扣沿用现有图，其余五款为新版整理图。

在线演示：https://1111-phi-ten.vercel.app/present/index.html?v=9#cover
GitHub 源码：https://github.com/zhenyaowang0401/Eumo/tree/main/present
来源提交：`05d099dd3beda1434a9d08277b54d108afefb84e`

## 在另一台电脑打开

1. 解压整个 `Eumo-Presentation-v9` 文件夹，保留目录结构。
2. 在该文件夹打开终端，运行 `node serve.cjs`，也可以运行 `npm start`。需要 Node.js，无需 `npm install`。
3. 浏览器打开 `http://127.0.0.1:8766/present/index.html#cover`。
4. 修改文件后刷新页面即可。关闭终端会停止本地预览。

如果电脑只有 Python，可运行 `python -m http.server 8766 --bind 127.0.0.1`；Windows 也可用 `py -m http.server 8766 --bind 127.0.0.1`，打开相同地址。直接打开根目录 `index.html` 会跳转到演示；如果本地文件模式受浏览器限制，请使用上述预览服务。

## 改哪里

| 文件 | 内容 |
| --- | --- |
| `present/index.html` | 每页结构、标题和固定文案 |
| `present/app.js` | 标签切换、研究内容、产品名称和描述 |
| `present/notes.js` | Sources / Evidence 等弹窗内容 |
| `present/revision.css` | 主要视觉调整 |
| `present/overview-scene.css` | 开篇右侧 Focus 场景和聊天区布局 |
| `present/keychain-sizing.css` | 六色钥匙扣尺寸与位置 |
| `present/assets/canele-yellow.png` | 黄色 Canele 展示图 |
| `present/assets/overview-focus.png` | 青蛙帽鼹鼠专注场景 |
| `present/assets/keychains/` | 五款新版钥匙扣素材 |

其余基础样式、动画、字体、共享花背景和第三方许可均随包附带。`docs/` 是研究和检查记录。`MANIFEST.json` 记录来源提交及文件校验值。

## 交接与回传

将整个文件夹交给另一台电脑上的编辑器或 Codex，先阅读 `HANDOFF.zh-CN.md`。如果对方可以访问 GitHub，推荐直接拉取完整 Eumo 仓库后修改 `present/`，这样更容易提交和同步。

这是演示的独立编辑包，不是整个游戏、ESP32 固件或数据库项目。包内的 Open Eumo 按钮打开正式游戏网站，外部论文链接需要联网。本地修改不会自动更新官网；修改完成后通过 GitHub 提交对应演示文件即可继续发布。

请勿用本包根目录的 `index.html`、`package.json` 或 `serve.cjs` 覆盖完整游戏仓库的同名文件，它们仅用于独立预览。无需提供 Vercel 或 Supabase 密钥来修改这份演示。
