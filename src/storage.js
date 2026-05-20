export const PROMPTS_KEY = "prompts";
export const SYNC_META_KEY = "syncMeta";

export async function getPrompts() {
  const result = await chrome.storage.local.get(PROMPTS_KEY);
  return Array.isArray(result[PROMPTS_KEY]) ? result[PROMPTS_KEY] : [];
}

export async function savePrompts(prompts) {
  await chrome.storage.local.set({ [PROMPTS_KEY]: prompts });
}

export async function getSyncMeta() {
  const result = await chrome.storage.local.get(SYNC_META_KEY);
  return result[SYNC_META_KEY] || null;
}

export async function saveSyncMeta(meta) {
  await chrome.storage.local.set({ [SYNC_META_KEY]: meta });
}
