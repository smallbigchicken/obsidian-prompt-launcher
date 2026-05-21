document.querySelector("#shortcut-label").textContent = /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
  ? "Option+Shift+P"
  : "Alt+Shift+P";

const statusElement = document.querySelector("#status");
const restrictedUrlPattern = /^(chrome|edge|brave|about|devtools):\/\//i;

document.querySelector("#open-palette").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (!canAccessTab(tab)) {
    setStatus("Open a normal webpage first. Browser internal pages cannot use the palette.");
    return;
  }

  try {
    await openPaletteInTab(tab.id);
    window.close();
  } catch (error) {
    setStatus(getOpenErrorMessage(error));
  }
});

document.querySelector("#open-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function openPaletteInTab(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "OPEN_PROMPT_PALETTE" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/contentScript.js"]
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["src/contentScript.css"]
    });
    await chrome.tabs.sendMessage(tabId, { type: "OPEN_PROMPT_PALETTE" });
  }
}

function canAccessTab(tab) {
  return Boolean(tab.url && !restrictedUrlPattern.test(tab.url));
}

function getOpenErrorMessage(error) {
  const message = error?.message || "";
  if (/Cannot access|chrome:\/\//i.test(message)) {
    return "This page does not allow extension access. Try a normal webpage.";
  }
  if (/file:\/\//i.test(message)) {
    return "Enable Allow access to file URLs for this extension, or try a normal webpage.";
  }
  return "Could not open the palette on this page. Try refreshing the page.";
}

function setStatus(message) {
  statusElement.textContent = message;
}
