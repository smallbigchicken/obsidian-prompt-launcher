(() => {
  if (window.__obsidianPromptLauncherLoaded) return;
  window.__obsidianPromptLauncherLoaded = true;

  const PROMPTS_KEY = "prompts";
  let lastFocusedElement = null;
  let selectedIndex = 0;
  let currentPrompts = [];
  let filteredPrompts = [];

  document.addEventListener("focusin", (event) => {
    if (isEditable(event.target)) {
      lastFocusedElement = event.target;
    }
  });

  window.addEventListener(
    "keydown",
    (event) => {
      if (!isOpenShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      openPalette();
    },
    true
  );

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "OPEN_PROMPT_PALETTE") {
      openPalette();
    }
  });

  async function openPalette() {
    const existing = document.querySelector(".opl-root");
    if (existing) {
      existing.remove();
      return;
    }

    const result = await chrome.storage.local.get(PROMPTS_KEY);
    currentPrompts = Array.isArray(result[PROMPTS_KEY]) ? result[PROMPTS_KEY] : [];
    filteredPrompts = currentPrompts;
    selectedIndex = 0;

    const root = document.createElement("div");
    root.className = "opl-root";
    root.innerHTML = `
      <section class="opl-panel" role="dialog" aria-modal="true" aria-label="Prompt launcher">
        <div class="opl-search">
          <input class="opl-input" type="search" placeholder="Search title, tag, shortcut, or prompt text" autocomplete="off" />
          <div class="opl-count"></div>
        </div>
        <div class="opl-list" role="listbox"></div>
        <div class="opl-footer">
          <span>Enter inserts · Esc closes</span>
          <span>${getShortcutLabel()} opens</span>
        </div>
      </section>
    `;

    root.addEventListener("click", (event) => {
      if (event.target === root) closePalette();
    });

    document.documentElement.append(root);

    const input = root.querySelector(".opl-input");
    input.addEventListener("input", () => {
      selectedIndex = 0;
      filteredPrompts = filterPrompts(currentPrompts, input.value);
      renderList(root);
    });
    input.addEventListener("keydown", (event) => handleKeydown(event, root));

    renderList(root);
    input.focus();
  }

  function handleKeydown(event, root) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredPrompts.length - 1);
      renderList(root);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderList(root);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const prompt = filteredPrompts[selectedIndex];
      if (prompt) insertPrompt(prompt.content);
    }
  }

  function renderList(root) {
    const list = root.querySelector(".opl-list");
    const count = root.querySelector(".opl-count");
    count.textContent = `${filteredPrompts.length} prompt${filteredPrompts.length === 1 ? "" : "s"}`;

    if (!currentPrompts.length) {
      list.innerHTML = `<div class="opl-empty">No prompts synced yet. Open the extension options and import your Obsidian prompt folder.</div>`;
      return;
    }

    if (!filteredPrompts.length) {
      list.innerHTML = `<div class="opl-empty">No matching prompts.</div>`;
      return;
    }

    list.innerHTML = filteredPrompts
      .map((prompt, index) => {
        const preview = compact(prompt.content).slice(0, 220);
        const tags = prompt.tags
          .slice(0, 5)
          .map((tag) => `<span class="opl-tag">${escapeHtml(tag)}</span>`)
          .join("");

        return `
          <button class="opl-item" type="button" role="option" aria-selected="${index === selectedIndex}" data-index="${index}">
            <div class="opl-title-row">
              <span class="opl-title">${escapeHtml(prompt.title)}</span>
              ${prompt.shortcut ? `<span class="opl-shortcut">${escapeHtml(prompt.shortcut)}</span>` : ""}
            </div>
            <div class="opl-preview">${escapeHtml(preview)}</div>
            ${tags ? `<div class="opl-tags">${tags}</div>` : ""}
          </button>
        `;
      })
      .join("");

    list.querySelectorAll(".opl-item").forEach((item) => {
      item.addEventListener("mouseenter", () => {
        selectedIndex = Number(item.dataset.index);
        renderList(root);
      });
      item.addEventListener("click", () => {
        const prompt = filteredPrompts[Number(item.dataset.index)];
        if (prompt) insertPrompt(prompt.content);
      });
    });

    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }

  function filterPrompts(prompts, query) {
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    if (!tokens.length) return prompts;

    return prompts.filter((prompt) => {
      const haystack = [
        prompt.title,
        prompt.shortcut,
        prompt.path,
        prompt.content,
        ...(prompt.tags || [])
      ]
        .join(" ")
        .toLowerCase();

      return tokens.every((token) => haystack.includes(token));
    });
  }

  async function insertPrompt(text) {
    const target = findTarget();
    if (!target) {
      await navigator.clipboard.writeText(text);
      closePalette();
      return;
    }

    target.focus();

    if (target.isContentEditable) {
      document.execCommand("insertText", false, text);
    } else if ("selectionStart" in target && "selectionEnd" in target) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      target.setRangeText(text, start, end, "end");
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    } else {
      await navigator.clipboard.writeText(text);
    }

    closePalette();
  }

  function findTarget() {
    if (isEditable(lastFocusedElement)) return lastFocusedElement;
    const active = document.activeElement;
    if (isEditable(active)) return active;
    return [...document.querySelectorAll("textarea, input[type='text'], [contenteditable='true']")]
      .filter(isVisible)
      .at(-1);
  }

  function isEditable(element) {
    if (!element || element.closest?.(".opl-root")) return false;
    if (element.isContentEditable) return true;
    if (element instanceof HTMLTextAreaElement) return true;
    if (!(element instanceof HTMLInputElement)) return false;
    return ["", "text", "search", "url", "email"].includes(element.type);
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function closePalette() {
    document.querySelector(".opl-root")?.remove();
  }

  function getShortcutLabel() {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "Option+Shift+P" : "Alt+Shift+P";
  }

  function isOpenShortcut(event) {
    const isP = event.code === "KeyP" || event.key?.toLowerCase() === "p";
    return isP && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.repeat;
  }

  function compact(value) {
    return String(value).replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
