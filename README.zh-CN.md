# Obsidian Prompt Launcher

Obsidian Prompt Launcher 是一个轻量浏览器扩展：把你的 Obsidian 提示词文件夹变成网页里的搜索面板。同步 Markdown 提示词后，在任意网页按 `Alt+Shift+P`，按标题、标签、快捷词、路径或正文搜索，然后把选中的提示词插入当前输入框。

[English README](README.md)

## 为什么做这个

很多人把 AI 提示词放在 Obsidian，因为 Markdown 易维护、可搜索、方便同步。麻烦的是每次都要切回 Obsidian、找笔记、复制提示词、再切回浏览器。这个扩展保留 Obsidian 作为唯一提示词仓库，同时让提示词可以直接在网页里调用。

## 功能

- 从 Obsidian 文件夹导入 Markdown 提示词。
- 浏览器权限允许时，可以从已保存的文件夹重新同步。
- 支持通过文件夹选择器兜底导入。
- 在任意网页按 `Alt+Shift+P` 搜索提示词。
- 支持插入到 textarea、文本输入框和 contenteditable 编辑器。
- 支持解析 `title`、`shortcut`、`tags` 这几个 frontmatter 字段。
- 所有提示词只保存在本地浏览器扩展存储中。

## 提示词格式

每个 `.md` 文件都可以是一条提示词。frontmatter 可选。

```markdown
---
title: Code Review
shortcut: ;review
tags: [coding, review]
---

Review the following code as a senior engineer. Focus on:

1. Bugs and edge cases
2. Maintainability
3. Security risks
4. Missing tests
```

标题优先使用 frontmatter 的 `title`，其次使用第一个 Markdown 标题，最后使用文件名。标签会从 frontmatter、正文里的 `#tag` 和文件夹名中提取。

## 本地安装

1. 打开 Chrome 或其他 Chromium 浏览器。
2. 进入 `chrome://extensions`。
3. 打开 **Developer mode / 开发者模式**。
4. 点击 **Load unpacked / 加载已解压的扩展程序**。
5. 选择本项目文件夹。
6. 打开扩展设置页。
7. 选择你的 Obsidian 提示词文件夹，或用文件导入功能导入。

## 使用方法

1. 在网页里聚焦输入框。
2. 按 `Alt+Shift+P`。
3. 搜索提示词。
4. 按 `Enter` 插入。

如果当前没有可插入的输入框，扩展会尽量把提示词复制到剪贴板。

## 开发

运行语法检查和解析器测试：

```bash
npm test
npm run check
```

本项目没有构建步骤，浏览器扩展可以直接从仓库目录加载。

## 隐私

提示词内容保存在本地 `chrome.storage.local` 中。扩展不会把提示词发送到任何服务器。

## 已知限制

- `chrome://extensions` 等浏览器内部页面不允许注入内容脚本。
- 某些网页使用特殊编辑器，可能阻止直接插入；这种情况下会尽量使用剪贴板兜底。
- 文件夹重新同步依赖浏览器对 File System Access API 以及已保存权限的支持。

## 许可证

MIT
