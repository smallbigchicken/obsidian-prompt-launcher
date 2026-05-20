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

console.log("markdownParser tests passed");
