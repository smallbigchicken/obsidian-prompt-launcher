chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-prompt-palette") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_PROMPT_PALETTE" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/contentScript.js"]
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["src/contentScript.css"]
    });
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_PROMPT_PALETTE" });
  }
});
