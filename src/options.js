import { parsePromptFile } from "./markdownParser.js";
import { getPrompts, getSyncMeta, savePrompts, saveSyncMeta } from "./storage.js";

const DB_NAME = "obsidian-prompt-launcher";
const STORE_NAME = "handles";
const HANDLE_KEY = "prompt-directory";
const SOURCE_PATH_KEY = "sourcePath";

const chooseFolderButton = document.querySelector("#choose-folder");
const resyncButton = document.querySelector("#resync");
const fileImportInput = document.querySelector("#file-import");
const statusElement = document.querySelector("#status");
const sourcePicker = document.querySelector("#source-picker");
const promptList = document.querySelector("#prompt-list");
const syncMetaElement = document.querySelector("#sync-meta");
const filterInput = document.querySelector("#filter");

let prompts = [];

chooseFolderButton.addEventListener("click", chooseFolder);
resyncButton.addEventListener("click", resyncFromSavedHandle);
fileImportInput.addEventListener("change", importFiles);
filterInput.addEventListener("input", render);

await boot();

async function boot() {
  prompts = await getPrompts();
  render();
  renderMeta(await getSyncMeta());
}

async function chooseFolder() {
  if (!window.showDirectoryPicker) {
    setStatus("This browser does not expose folder access here. Use Import Files instead.");
    return;
  }

  try {
    const handle = await window.showDirectoryPicker({ mode: "read", startIn: "documents" });
    await saveHandle(handle);
    await showSourceChoices(handle);
  } catch (error) {
    if (error.name !== "AbortError") setStatus(`Folder sync failed: ${error.message}`);
  }
}

async function resyncFromSavedHandle() {
  const handle = await loadHandle();
  if (!handle) {
    setStatus("No saved folder yet. Choose a folder first.");
    return;
  }

  const permission = await verifyPermission(handle);
  if (!permission) {
    setStatus("Folder permission is needed again. Choose the folder once more.");
    return;
  }

  const sourcePath = await loadSourcePath();
  await syncFromDirectoryHandle(handle, sourcePath);
}

async function showSourceChoices(handle) {
  setStatus("Reading Markdown prompts...");
  const files = await collectMarkdownFiles(handle);
  if (!files.length) {
    sourcePicker.hidden = true;
    setStatus("No Markdown files found in this folder.");
    return;
  }

  renderSourceChoices(handle, buildSourceChoices(files));
  setStatus(`Found ${files.length} Markdown files. Choose what to sync.`);
}

async function syncFromDirectoryHandle(handle, sourcePath = "") {
  setStatus("Reading Markdown prompts...");
  const files = await collectMarkdownFiles(handle);
  const selectedFiles = sourcePath
    ? files.filter((fileEntry) => fileEntry.path === sourcePath || fileEntry.path.startsWith(`${sourcePath}/`))
    : files;
  const parsedPrompts = [];

  for (const fileEntry of selectedFiles) {
    const file = await fileEntry.handle.getFile();
    const text = await file.text();
    const relativePath = sourcePath ? fileEntry.path.slice(sourcePath.length).replace(/^\//, "") : fileEntry.path;
    const prompt = parsePromptFile(relativePath, text);
    if (prompt.content) parsedPrompts.push(prompt);
  }

  parsedPrompts.sort((a, b) => a.title.localeCompare(b.title));
  await persistPrompts(parsedPrompts, {
    source: sourcePath ? `${handle.name}/${sourcePath}` : handle.name,
    sourcePath,
    syncedAt: new Date().toISOString(),
    count: parsedPrompts.length
  });
}

async function importFiles(event) {
  const files = [...event.target.files].filter((file) => file.name.toLowerCase().endsWith(".md"));
  const parsedPrompts = [];

  for (const file of files) {
    const text = await file.text();
    const path = file.webkitRelativePath || file.name;
    const prompt = parsePromptFile(path, text);
    if (prompt.content) parsedPrompts.push(prompt);
  }

  parsedPrompts.sort((a, b) => a.title.localeCompare(b.title));
  await persistPrompts(parsedPrompts, {
    source: "Imported files",
    syncedAt: new Date().toISOString(),
    count: parsedPrompts.length
  });

  event.target.value = "";
}

function renderSourceChoices(handle, choices) {
  sourcePicker.hidden = false;
  sourcePicker.innerHTML = choices
    .map(
      (choice) => `
        <button class="source-option" type="button" data-path="${escapeHtml(choice.path)}">
          <span>
            <span class="source-title">${escapeHtml(choice.title)}</span>
            <span class="source-path">${escapeHtml(choice.path || "All folders")}</span>
          </span>
          <span class="source-count">${choice.count} files</span>
        </button>
      `
    )
    .join("");

  sourcePicker.querySelectorAll(".source-option").forEach((button) => {
    button.addEventListener("click", async () => {
      const sourcePath = button.dataset.path || "";
      await saveSourcePath(sourcePath);
      sourcePicker.hidden = true;
      await syncFromDirectoryHandle(handle, sourcePath);
    });
  });
}

function buildSourceChoices(files) {
  const directoryCounts = new Map();
  for (const file of files) {
    const parts = file.path.split("/").slice(0, -1);
    for (let index = 1; index <= parts.length; index += 1) {
      const directory = parts.slice(0, index).join("/");
      directoryCounts.set(directory, (directoryCounts.get(directory) || 0) + 1);
    }
  }

  const folderChoices = [...directoryCounts.entries()]
    .map(([path, count]) => ({
      path,
      count,
      title: getFolderTitle(path)
    }))
    .filter((choice) => choice.count > 0)
    .sort((a, b) => scoreSourceChoice(b) - scoreSourceChoice(a) || a.path.localeCompare(b.path));

  return [
    { path: "", count: files.length, title: "All Markdown notes" },
    ...folderChoices.slice(0, 24)
  ];
}

function getFolderTitle(path) {
  const name = path.split("/").at(-1);
  return isLikelyPromptFolder(path) ? `${name} · suggested` : name;
}

function scoreSourceChoice(choice) {
  const promptScore = isLikelyPromptFolder(choice.path) ? 1000 : 0;
  const depthPenalty = choice.path.split("/").length * 2;
  return promptScore + choice.count - depthPenalty;
}

function isLikelyPromptFolder(path) {
  return /prompt|prompts|提示词|模板|template|templates/i.test(path);
}

async function persistPrompts(nextPrompts, meta) {
  prompts = nextPrompts;
  await savePrompts(prompts);
  await saveSyncMeta(meta);
  render();
  renderMeta(meta);
  setStatus(`Synced ${prompts.length} prompts.`);
}

async function collectMarkdownFiles(directoryHandle, basePath = "") {
  const files = [];

  for await (const [name, handle] of directoryHandle.entries()) {
    const path = basePath ? `${basePath}/${name}` : name;
    if (handle.kind === "directory") {
      files.push(...(await collectMarkdownFiles(handle, path)));
      continue;
    }
    if (handle.kind === "file" && name.toLowerCase().endsWith(".md")) {
      files.push({ path, handle });
    }
  }

  return files;
}

async function verifyPermission(handle) {
  const options = { mode: "read" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  return (await handle.requestPermission(options)) === "granted";
}

async function saveHandle(handle) {
  const db = await openDb();
  await requestToPromise(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(handle, HANDLE_KEY));
}

async function loadHandle() {
  const db = await openDb();
  return requestToPromise(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(HANDLE_KEY));
}

async function saveSourcePath(sourcePath) {
  await chrome.storage.local.set({ [SOURCE_PATH_KEY]: sourcePath });
}

async function loadSourcePath() {
  const result = await chrome.storage.local.get(SOURCE_PATH_KEY);
  return result[SOURCE_PATH_KEY] || "";
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function render() {
  const query = filterInput.value.toLowerCase().trim();
  const visiblePrompts = prompts.filter((prompt) => {
    if (!query) return true;
    return [prompt.title, prompt.path, prompt.shortcut, prompt.content, ...(prompt.tags || [])]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  if (!visiblePrompts.length) {
    promptList.innerHTML = `<div class="empty">${prompts.length ? "No matching prompts." : "No prompts synced yet."}</div>`;
    return;
  }

  promptList.innerHTML = visiblePrompts
    .map((prompt) => {
      const tags = (prompt.tags || [])
        .slice(0, 8)
        .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join("");

      return `
        <article class="prompt-card">
          <div class="prompt-head">
            <div>
              <div class="prompt-title">${escapeHtml(prompt.title)}</div>
              <div class="prompt-path">${escapeHtml(prompt.path)}</div>
            </div>
            ${prompt.shortcut ? `<div class="shortcut">${escapeHtml(prompt.shortcut)}</div>` : ""}
          </div>
          ${tags ? `<div class="tags">${tags}</div>` : ""}
          <div class="preview">${escapeHtml(compact(prompt.content).slice(0, 260))}</div>
        </article>
      `;
    })
    .join("");
}

function renderMeta(meta) {
  if (!meta) {
    syncMetaElement.textContent = "No sync yet.";
    return;
  }

  const syncedAt = new Date(meta.syncedAt).toLocaleString();
  syncMetaElement.textContent = `${meta.count} prompts · ${meta.source} · ${syncedAt}`;
}

function setStatus(message) {
  statusElement.textContent = message;
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
