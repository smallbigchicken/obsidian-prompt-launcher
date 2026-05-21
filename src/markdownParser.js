const FRONTMATTER_RE = /^\s*---\s*\n([\s\S]*?)\n---\s*\n?/;

export function parsePromptFile(path, rawText) {
  const frontmatterMatch = rawText.match(FRONTMATTER_RE);
  let frontmatter = frontmatterMatch ? parseFrontmatter(frontmatterMatch[1]) : {};
  let body = frontmatterMatch ? rawText.slice(frontmatterMatch[0].length) : rawText;

  if (!frontmatterMatch) {
    const extracted = extractLeadingMetadata(body);
    frontmatter = extracted.metadata;
    body = extracted.body;
  }

  const headingMatch = body.match(/^\s*#\s+(.+)\s*$/m);
  const fileName = path.split("/").pop()?.replace(/\.md$/i, "") || "Untitled prompt";
  const title = frontmatter.title || headingMatch?.[1]?.trim() || fileName;

  body = stripObsidianWaypoints(stripLeadingTitleHeading(body, title)).trim();

  const tags = unique([
    ...normalizeTags(frontmatter.tags),
    ...extractInlineTags(rawText),
    ...path
      .split("/")
      .slice(0, -1)
      .map((part) => part.trim())
      .filter(Boolean)
  ]);

  return {
    id: stableId(path),
    title,
    shortcut: frontmatter.shortcut || frontmatter.alias || "",
    tags,
    path,
    content: body,
    updatedAt: new Date().toISOString()
  };
}

function parseFrontmatter(text) {
  const data = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    const [, key, value] = match;
    data[key] = parseValue(value);
  }
  return data;
}

function extractLeadingMetadata(text) {
  const lines = text.replace(/^\s+/, "").split("\n");
  const metadata = {};
  let index = 0;

  for (; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (isObsidianWaypoint(line.trim())) continue;

    const match = line.match(/^(title|shortcut|alias|tags):\s*(.*)$/i);
    if (!match) break;

    metadata[match[1].toLowerCase()] = parseValue(match[2]);
  }

  return {
    metadata,
    body: lines.slice(index).join("\n")
  };
}

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => cleanScalar(item))
      .filter(Boolean);
  }
  return cleanScalar(trimmed);
}

function cleanScalar(value) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function normalizeTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map(cleanTag).filter(Boolean);
  return String(value)
    .split(",")
    .map(cleanTag)
    .filter(Boolean);
}

function extractInlineTags(text) {
  return [...text.matchAll(/(^|\s)#([\p{L}\p{N}_/-]+)/gu)].map((match) => cleanTag(match[2]));
}

function cleanTag(tag) {
  return String(tag).trim().replace(/^#/, "");
}

function stripLeadingTitleHeading(body, title) {
  const escapedTitle = escapeRegExp(title);
  return body.replace(new RegExp(`^\\s*#\\s+${escapedTitle}\\s*\\n+`, "i"), "");
}

function stripObsidianWaypoints(body) {
  return body
    .split("\n")
    .filter((line) => !isObsidianWaypoint(line.trim()))
    .join("\n");
}

function isObsidianWaypoint(line) {
  return /^%%\s*Begin Waypoint\s*%%.*%%\s*End Waypoint\s*%%\s*$/i.test(line);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function stableId(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `prompt-${Math.abs(hash)}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
