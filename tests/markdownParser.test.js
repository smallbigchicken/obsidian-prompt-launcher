import assert from "node:assert/strict";
import { parsePromptFile } from "../src/markdownParser.js";

const prompt = parsePromptFile(
  "AI/Coding/review.md",
  `---
title: Code Review
shortcut: ;review
tags: [coding, review]
---

# Code Review

Review this code. #quality
`
);

assert.equal(prompt.title, "Code Review");
assert.equal(prompt.shortcut, ";review");
assert.equal(prompt.content, "Review this code. #quality");
assert.deepEqual(prompt.tags, ["coding", "review", "quality", "AI", "Coding"]);
assert.equal(prompt.path, "AI/Coding/review.md");

const fallback = parsePromptFile("drafts/polish.md", "Please polish this text.");
assert.equal(fallback.title, "polish");
assert.equal(fallback.content, "Please polish this text.");

const chinesePrompt = parsePromptFile(
  "提示词/文献检索.md",
  `
---
title: AI学术文献检索与多研究方向脉络梳理
shortcut: ;lit-search
tags: [学术研究, 文献检索, 论文大纲与开题准备]
---

## 角色定位

你是一位资深、严谨的学术情报专家。
`
);

assert.equal(chinesePrompt.title, "AI学术文献检索与多研究方向脉络梳理");
assert.equal(chinesePrompt.shortcut, ";lit-search");
assert.deepEqual(chinesePrompt.tags, ["学术研究", "文献检索", "论文大纲与开题准备", "提示词"]);
assert.equal(chinesePrompt.content, "## 角色定位\n\n你是一位资深、严谨的学术情报专家。");

console.log("markdownParser tests passed");
