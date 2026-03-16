import { NextResponse } from "next/server";
import { getWorkspaceRoot, openclawProfileCommand, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

function parseIdentityName(content) {
  const patterns = [
    /^\*Nombre:\*\s*(.+)$/im,
    /^\*\*Nombre:\*\*\s*(.+)$/im,
    /^-\s*\*\*Name:\*\*\s*(.+)$/im,
    /^\*\*Name:\*\*\s*(.+)$/im,
    /^Name:\s*(.+)$/im,
    /^Nombre:\s*(.+)$/im,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/[\*_`]/g, "");
    }
  }

  const headingMatch = content.match(/IDENTITY\.md\s*-\s*(.+)$/im);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim().replace(/[\*_`]/g, "");
  }

  return null;
}

export async function GET() {
  try {
    const identityPath = `${getWorkspaceRoot()}/IDENTITY.md`;
    const cmd = `
      STATUS="$(${openclawProfileCommand("status")} 2>/dev/null | sed -n '1,120p')"
      printf '%s\n__IDENTITY_SPLIT__\n' "$STATUS"
      if [ -f ${shellEscape(identityPath)} ]; then
        sed -n '1,120p' ${shellEscape(identityPath)}
      fi
    `;
    const { stdout } = await runRemote(cmd);
    const [statusPart = "", identityPart = ""] = stdout.split("__IDENTITY_SPLIT__");
    const directMatch = statusPart.match(/agent:main:main[\s\S]*?│\s*direct\s*│[^│]*│\s*([^│]+?)\s*│/i);
    const modelMatch = statusPart.match(/Sessions\s+│[^\n]*default\s+([\w./-]+)/i);
    const model = directMatch?.[1]?.trim() || modelMatch?.[1] || null;
    const name = parseIdentityName(identityPart) || "Agente";

    return NextResponse.json({ ok: true, model, name });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
