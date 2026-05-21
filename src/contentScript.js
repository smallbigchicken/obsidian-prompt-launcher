(() => {
  if (window.__obsidianPromptLauncherLoaded) return;
  window.__obsidianPromptLauncherLoaded = true;

  const PROMPTS_KEY = "prompts";
  let lastFocusedElement = null;
  let selectedIndex = 0;
  let currentPrompts = [];
  let filteredPrompts = [];
  let pendingPromptText = "";

  document.addEventListener("focusin", (event) => {
    if (isEditable(event.target)) {
      lastFocusedElement = event.target;
    }
  });

  window.addEventListener(
    "keydown",
    (event) => {
      if (!isOpenShortcut(event)) return;
      if (isEditable(event.target)) lastFocusedElement = event.target;
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
    currentPrompts = Array.isArray(result[PROMPTS_KEY])
      ? result[PROMPTS_KEY].map((prompt) => ({
          ...prompt,
          content: sanitizePromptContent(prompt.content)
        }))
      : [];
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
      const copied = await writeClipboard(text);
      startTargetPicker(text, copied ? "Prompt copied. Click the chat box to insert it." : "Click the chat box to insert the prompt.");
      closePalette();
      return;
    }

    const copied = await writeClipboard(text);
    const inserted = dispatchPasteIntoTarget(target, text) || insertIntoTarget(target, text);
    if (!inserted) {
      startTargetPicker(text, copied ? "Prompt copied. Click the chat box to insert it." : "Click the chat box to insert the prompt.");
    } else {
      showToast("Prompt inserted.");
    }

    closePalette();
  }

  function findTarget() {
    if (isEditable(lastFocusedElement)) return lastFocusedElement;
    const active = document.activeElement;
    if (isEditable(active)) return active;
    return getEditableCandidates().at(-1) || null;
  }

  function startTargetPicker(text, message) {
    pendingPromptText = text;
    showTargetPicker(message);
  }

  async function tryPendingInsert(target) {
    if (!pendingPromptText) return;

    const text = pendingPromptText;
    const resolvedTarget = resolveEditableTarget(target);
    if (!isEditable(resolvedTarget)) return;

    await writeClipboard(text);
    const inserted = dispatchPasteIntoTarget(resolvedTarget, text) || insertIntoTarget(resolvedTarget, text);
    if (inserted) {
      pendingPromptText = "";
      removeTargetPicker();
      showToast("Prompt inserted.");
    } else {
      showToast(`Prompt copied. Press ${getPasteShortcutLabel()} to paste it.`);
    }
  }

  function insertIntoTarget(target, text) {
    target = resolveEditableTarget(target);
    target.focus({ preventScroll: true });

    if (isTextControl(target)) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      setNativeTextValue(target, `${target.value.slice(0, start)}${text}${target.value.slice(end)}`);
      const cursor = start + text.length;
      target.setSelectionRange(cursor, cursor);
      dispatchEditorEvents(target, text);
      return true;
    }

    if (isRichTextTarget(target)) {
      ensureSelectionInside(target);
      const inserted = document.execCommand("insertText", false, text) || insertPlainTextAtSelection(text);
      dispatchEditorEvents(target, text);
      return inserted || target.textContent.includes(text.slice(0, Math.min(text.length, 24)));
    }

    return false;
  }

  function dispatchPasteIntoTarget(target, text) {
    target = resolveEditableTarget(target);
    target.focus({ preventScroll: true });
    ensureSelectionInside(target);

    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", text);
    const event = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    });
    const notCanceled = target.dispatchEvent(event);

    if (notCanceled) {
      document.execCommand("insertText", false, text);
    }

    dispatchEditorEvents(target, text);
    return Boolean(target.value?.includes(text) || target.textContent?.includes(text.slice(0, Math.min(text.length, 24))));
  }

  function getEditableCandidates() {
    const selector = [
      "textarea:not([disabled])",
      "input:not([disabled])",
      "[contenteditable]:not([contenteditable='false'])",
      "[role='textbox']",
      ".ProseMirror",
      "[data-lexical-editor='true']"
    ].join(",");

    return [...document.querySelectorAll(selector)]
      .map(resolveEditableTarget)
      .filter((element, index, elements) => element && elements.indexOf(element) === index)
      .filter((element) => isEditable(element) && isVisible(element))
      .sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return scoreEditable(a) - scoreEditable(b) || rectA.bottom - rectB.bottom || rectA.right - rectB.right;
      });
  }

  function isEditable(element) {
    if (!element || element.closest?.(".opl-root")) return false;
    if (isRichTextTarget(element)) return true;
    if (element instanceof HTMLTextAreaElement) return !element.readOnly && !element.disabled;
    if (!(element instanceof HTMLInputElement)) return false;
    return !element.readOnly && !element.disabled && ["", "text", "search", "url", "email"].includes(element.type);
  }

  function isTextControl(element) {
    return element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement;
  }

  function isRichTextTarget(element) {
    return Boolean(
      element?.isContentEditable ||
        element?.matches?.("[contenteditable]:not([contenteditable='false']), [role='textbox'], .ProseMirror, [data-lexical-editor='true']")
    );
  }

  function resolveEditableTarget(element) {
    if (!element) return null;
    if (isTextControl(element) || element.isContentEditable || element.matches?.(".ProseMirror, [data-lexical-editor='true']")) {
      return element;
    }

    return (
      element.querySelector?.("textarea:not([disabled]), input:not([disabled]), [contenteditable]:not([contenteditable='false']), .ProseMirror, [data-lexical-editor='true']") ||
      element
    );
  }

  window.addEventListener(
    "pointerdown",
    (event) => {
      if (!pendingPromptText || event.target.closest?.(".opl-target-picker")) return;
      const target = findEditableFromEvent(event);
      if (!target) return;
      window.setTimeout(() => tryPendingInsert(target), 0);
    },
    true
  );

  document.addEventListener(
    "focusin",
    (event) => {
      if (!pendingPromptText || !isEditable(event.target)) return;
      tryPendingInsert(event.target);
    },
    true
  );

  function findEditableFromEvent(event) {
    for (const item of event.composedPath?.() || []) {
      if (!(item instanceof Element)) continue;
      if (isEditable(item)) return item;
      const nested = resolveEditableTarget(item);
      if (isEditable(nested)) return nested;
    }
    return null;
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function ensureSelectionInside(target) {
    if (!isRichTextTarget(target)) return;
    const selection = window.getSelection();
    if (selection?.rangeCount && target.contains(selection.anchorNode)) return;

    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function insertPlainTextAtSelection(text) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return false;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function setNativeTextValue(target, value) {
    const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor?.set) {
      descriptor.set.call(target, value);
    } else {
      target.value = value;
    }
  }

  function dispatchEditorEvents(target, text) {
    target.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function scoreEditable(element) {
    let score = 0;
    if (element instanceof HTMLTextAreaElement) score += 100;
    if (element.isContentEditable) score += 80;
    if (element.matches?.("[role='textbox']")) score += 60;
    if (element.matches?.(".ProseMirror, [data-lexical-editor='true']")) score += 70;
    if (element.getAttribute?.("aria-label")?.match(/message|prompt|chat|消息|发送|输入/i)) score += 40;
    if (element.getAttribute?.("placeholder")?.match(/message|prompt|chat|消息|发送|输入/i)) score += 40;
    const rect = element.getBoundingClientRect();
    score += Math.min(rect.width, 800) / 100;
    score += rect.bottom / 1000;
    return score;
  }

  function showToast(message) {
    const existing = document.querySelector(".opl-toast");
    existing?.remove();

    const toast = document.createElement("div");
    toast.className = "opl-toast";
    toast.textContent = message;
    document.documentElement.append(toast);
    window.setTimeout(() => toast.remove(), 2400);
  }

  function showTargetPicker(message) {
    removeTargetPicker();

    const picker = document.createElement("div");
    picker.className = "opl-target-picker";
    picker.innerHTML = `
      <span>${escapeHtml(message)}</span>
      <button type="button">Cancel</button>
    `;
    picker.querySelector("button").addEventListener("click", () => {
      pendingPromptText = "";
      removeTargetPicker();
    });
    document.documentElement.append(picker);
  }

  function removeTargetPicker() {
    document.querySelector(".opl-target-picker")?.remove();
  }

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function getPasteShortcutLabel() {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "Cmd+V" : "Ctrl+V";
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

  function sanitizePromptContent(text) {
    const source = String(text || "");
    const withoutFrontmatter = source.replace(/^\s*---\s*\n[\s\S]*?\n---\s*\n?/, "");
    const lines = withoutFrontmatter.replace(/^\uFEFF/, "").split("\n");
    let index = 0;
    let removedMetadata = false;

    for (; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line) continue;
      if (isObsidianWaypoint(line) || isPromptMetadataLine(line)) {
        removedMetadata = true;
        continue;
      }
      break;
    }

    return removedMetadata ? lines.slice(index).join("\n").trimStart() : withoutFrontmatter.trim();
  }

  function isPromptMetadataLine(line) {
    return /^(title|shortcut|alias|tags):\s*/i.test(line);
  }

  function isObsidianWaypoint(line) {
    return /^%%\s*Begin Waypoint\s*%%.*%%\s*End Waypoint\s*%%\s*$/i.test(line);
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
