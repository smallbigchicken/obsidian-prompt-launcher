# Obsidian Prompt Launcher

Obsidian Prompt Launcher is a small browser extension that turns an Obsidian prompt folder into a searchable command palette for the web. Sync your Markdown prompt notes once, press `Alt+Shift+P` on any webpage, search by title, tag, shortcut, path, or content, then insert the selected prompt into the active input.

[中文说明](README.zh-CN.md)

## Why

Many AI workflows keep prompt templates in Obsidian because Markdown is portable, searchable, and easy to sync. The painful part is switching back to Obsidian, finding a note, copying the prompt, and returning to the browser. This extension keeps Obsidian as the source of truth while making prompts available directly where you use AI.

## Features

- Import Markdown prompts from an Obsidian folder.
- Re-sync from the saved folder handle when browser permission allows it.
- Fallback import through a folder file picker.
- Search prompts on any webpage with `Alt+Shift+P`.
- Insert into textareas, text inputs, and contenteditable editors.
- Parse optional frontmatter fields: `title`, `shortcut`, and `tags`.
- Keep all prompt data local in browser extension storage.

## Prompt Format

Each `.md` file can be a prompt. Frontmatter is optional.

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

The extension uses the frontmatter title first, then the first Markdown heading, then the filename. Tags can come from frontmatter, inline `#tags`, and folder names.

## Prompt for Creating Searchable Prompts

Use this meta-prompt when you ask an AI assistant to create a new prompt note for this extension:

```text
Create a reusable Markdown prompt note for Obsidian Prompt Launcher.

The note must be easy to search and must follow this exact structure:

---
title: A short, specific English title
shortcut: ;a-short-trigger
tags: [domain, task, tool-or-scenario]
---

Prompt body here.

Requirements:

1. The title must describe the actual use case, not a vague name.
2. The shortcut must start with ; and use lowercase letters, numbers, or hyphens only.
3. Tags must include at least one domain tag, one task tag, and one usage scenario tag.
4. The prompt body must state the assistant role, the task, input expectations, output format, and quality criteria.
5. Include searchable keywords naturally in the title, tags, and body.
6. Do not include explanations about why the prompt works.
7. Return only the final Markdown note.

Prompt purpose:
[Describe what this prompt should help me do]

Typical input I will paste after the prompt:
[Describe the input type, such as code, meeting notes, an article draft, product idea, or data]

Desired output:
[Describe the output format, such as bullet findings, rewritten text, table, plan, or checklist]
```

## Install Locally

1. Open Chrome or another Chromium browser.
2. Go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this project folder.
6. Open the extension options page.
7. Choose your Obsidian prompt folder or import files.

## Usage

1. Focus the input box on a webpage.
2. Press `Alt+Shift+P`.
3. Search for a prompt.
4. Press `Enter` to insert it.

If no compatible input is focused, the extension copies the prompt to your clipboard as a fallback.

## Development

Run syntax checks and parser tests:

```bash
npm test
npm run check
```

This project has no build step. The extension loads directly from the repository folder.

## Privacy

Prompt content is stored locally with `chrome.storage.local`. The extension does not send prompt content to any server.

## Limitations

- Browser pages such as `chrome://extensions` do not allow content scripts.
- Some web apps implement custom editors that may block direct insertion. Clipboard fallback is used where possible.
- Folder re-sync depends on browser support for the File System Access API and saved permissions.

## License

MIT
