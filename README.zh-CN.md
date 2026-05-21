# Obsidian Prompt Launcher

Obsidian Prompt Launcher 是一个轻量浏览器扩展：把你的 Obsidian 提示词文件夹变成网页里的搜索面板。同步 Markdown 提示词后，在任意网页按 macOS 的 `Option+Shift+P` 或 Windows 的 `Alt+Shift+P`，按标题、标签、快捷词、路径或正文搜索，然后把选中的提示词插入当前输入框。

[English README](README.md)

## 为什么做这个

很多人把 AI 提示词放在 Obsidian，因为 Markdown 易维护、可搜索、方便同步。麻烦的是每次都要切回 Obsidian、找笔记、复制提示词、再切回浏览器。这个扩展保留 Obsidian 作为唯一提示词仓库，同时让提示词可以直接在网页里调用。

## 功能

- 从 Obsidian 文件夹导入 Markdown 提示词。
- 先选择 Obsidian vault，再从扩展扫描出的子文件夹中选择提示词目录。
- 浏览器权限允许时，可以从已保存的文件夹重新同步。
- 支持通过文件夹选择器兜底导入。
- 在任意网页按 macOS 的 `Option+Shift+P` 或 Windows 的 `Alt+Shift+P` 搜索提示词。
- 支持插入到 textarea、文本输入框和 contenteditable 编辑器。
- 支持解析 `title`、`shortcut`、`tags` 这几个 frontmatter 字段。
- 所有提示词只保存在本地浏览器扩展存储中。

## 平台支持

这个扩展通过 Chromium 系浏览器支持 macOS 和 Windows。

| 平台 | 支持的浏览器 | 快捷键 |
| --- | --- | --- |
| macOS | Chrome、Edge、Brave、Arc 及其他 Chromium 浏览器 | `Option+Shift+P` |
| Windows | Chrome、Edge、Brave 及其他 Chromium 浏览器 | `Alt+Shift+P` |

Firefox 和 Safari 暂未支持，因为当前项目使用的是 Chrome 扩展 API，以及 Chromium 的本地文件夹访问能力。

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

## 制作可检索提示词的提示词

当你想让 AI 帮你生成一条新的提示词笔记时，可以直接复制下面这段：

```text
请为 Obsidian Prompt Launcher 创建一条可复用的 Markdown 提示词笔记。

这条笔记必须容易被搜索，并严格使用下面的结构：

---
title: 简短、具体的中文标题
shortcut: ;简短触发词
tags: [领域, 任务, 工具或场景]
---

提示词正文写在这里。

要求：

1. title 必须描述真实用途，不要使用模糊名称。
2. shortcut 必须以 ; 开头，尽量使用小写英文、数字或连字符。
3. tags 至少包含一个领域标签、一个任务标签、一个使用场景标签。
4. 提示词正文必须写清楚 AI 角色、具体任务、输入内容要求、输出格式和质量标准。
5. 在 title、tags 和正文中自然加入便于搜索的关键词。
6. 不要解释这条提示词为什么有效。
7. 只返回最终 Markdown 笔记。

提示词用途：
[描述这条提示词要帮我完成什么]

我通常会粘贴的输入：
[描述输入类型，例如代码、会议记录、文章草稿、产品想法或数据]

我希望得到的输出：
[描述输出格式，例如问题清单、润色文本、表格、方案或检查清单]
```

## macOS 安装

1. 打开 Chrome 或其他 Chromium 浏览器。
2. 进入 `chrome://extensions`。
3. 打开 **Developer mode / 开发者模式**。
4. 点击 **Load unpacked / 加载已解压的扩展程序**。
5. 选择本项目文件夹。
6. 打开扩展设置页。
7. 选择你的 Obsidian vault。
8. 从扫描出的文件夹列表中选择提示词目录，或用文件导入功能兜底导入。

## Windows 安装

1. 打开 Chrome、Edge、Brave 或其他 Chromium 浏览器。
2. 进入 `chrome://extensions`。
3. 打开 **Developer mode / 开发者模式**。
4. 点击 **Load unpacked / 加载已解压的扩展程序**。
5. 选择本项目文件夹。
6. 打开扩展设置页。
7. 选择你的 Obsidian vault。
8. 从扫描出的文件夹列表中选择提示词目录，或用文件导入功能兜底导入。

## 使用方法

1. 在网页里聚焦输入框。
2. macOS 按 `Option+Shift+P`，Windows 按 `Alt+Shift+P`。
3. 搜索提示词。
4. 按 `Enter` 插入。

如果当前没有可插入的输入框，扩展会尽量把提示词复制到剪贴板。

## 快捷键排查

- 重新加载扩展后，已经打开的网页需要刷新一次，内容脚本会在页面加载后注入。
- `chrome://extensions` 这类浏览器内部页面不能打开提示词面板。
- 本地 `file://` 页面需要在扩展详情页打开 **Allow access to file URLs / 允许访问文件网址**。
- 如果浏览器层面的快捷键没有注册成功，或被其他扩展占用，页面级兜底仍会监听 macOS 的 `Option+Shift+P` 和 Windows 的 `Alt+Shift+P`。
- 也可以点击扩展图标，然后点 **Open Palette**。

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
