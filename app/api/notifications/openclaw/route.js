import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function compact(text, max = 62) {
  const cleaned = String(text || "")
    .replace(/\(#\d+\)/g, "")
    .replace(/Thanks\s+@[^.]+\.?/gi, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

function buildHighlights(body) {
  const highlights = [];

  if (/Hunter Alpha|Healer Alpha/i.test(body)) {
    highlights.push("🏹 Hunter + 🩹 Healer Alpha en OpenRouter");
  }
  if (/\/fast mode|fast mode/i.test(body)) {
    highlights.push("⚡ /fast mode para modelos");
  }
  if (/GPT 5\.4/i.test(body)) {
    highlights.push("🧠 GPT 5.4 con respuestas más estables");
  }
  if (/gemini-embedding-2-preview|Gemini Embedding 2/i.test(body)) {
    highlights.push("💎 Gemini Embedding 2 para memoria");
  }
  if (/OpenCode Go|opencode-go|Go support/i.test(body)) {
    highlights.push("💻 soporte Go en OpenCode");
  }
  if (/ollama|sglang|vllm/i.test(body)) {
    highlights.push("🔌 ollama / sglang / vllm pasan a plugins");
  }
  if (/Security|device tokens now ephemeral|ephemeral/i.test(body)) {
    highlights.push("🛡️ endurecimiento y tokens efímeros");
  }
  if (/cron|windows reliability/i.test(body)) {
    highlights.push("⏰ mejoras de cron y confiabilidad en Windows");
  }

  if (highlights.length >= 5) return highlights.slice(0, 5);

  const genericBullets = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || line.startsWith("* "))
    .map((line) => line.replace(/^[-*]\s*/, ""))
    .slice(0, 8);

  const emojiPool = ["✨", "⚙️", "🧩", "🚀", "🛠️"];
  for (const item of genericBullets) {
    if (highlights.length >= 5) break;
    const line = compact(item);
    if (!line) continue;
    const emoji = emojiPool[highlights.length % emojiPool.length];
    highlights.push(`${emoji} ${line}`);
  }

  return highlights.slice(0, 5);
}

function buildSummary(name, tagName, highlights) {
  const title = `${name || tagName || "OpenClaw update"} 🦞`;
  return [title, ...highlights].filter(Boolean).join("\n");
}

export async function GET() {
  try {
    const response = await fetch("https://api.github.com/repos/openclaw/openclaw/releases/latest", {
      headers: {
        "User-Agent": "openclaw-vps-dashboard",
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`GitHub release request failed: ${response.status}`);
    }

    const release = await response.json();
    const body = String(release.body || "");
    const name = release.name || release.tag_name || "OpenClaw update";
    const highlights = buildHighlights(body);

    return NextResponse.json({
      items: [
        {
          id: release.id,
          title: name,
          version: release.tag_name,
          publishedAt: release.published_at,
          headline: `${name} 🦞`,
          highlights,
          summary: buildSummary(name, release.tag_name, highlights),
          url: release.html_url,
          sources: {
            github: release.html_url,
            x: "https://x.com/openclaw",
          },
        },
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
