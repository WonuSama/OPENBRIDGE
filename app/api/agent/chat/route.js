import { NextResponse } from "next/server";
import { openclawProfileCommand, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const message = String(body.message || "").trim();
    const agentId = String(body.agentId || "main").trim() || "main";
    if (!message) {
      return NextResponse.json({ error: "Falta mensaje." }, { status: 400 });
    }

    const cmd = `${openclawProfileCommand(`agent --agent ${shellEscape(agentId)} --message ${shellEscape(message)} --json`)} 2>/dev/null`;
    const { stdout } = await runRemote(cmd);
    const parsed = JSON.parse(stdout || "{}");
    const payloads = parsed?.result?.payloads || [];
    const text = payloads.map((item) => item?.text).filter(Boolean).join("\n\n") || "Sin respuesta";
    const sessionKey = parsed?.result?.meta?.systemPromptReport?.sessionKey || `agent:${agentId}:main`;

    return NextResponse.json({
      ok: true,
      text,
      sessionKey,
      model: parsed?.result?.meta?.agentMeta?.model || null,
      provider: parsed?.result?.meta?.agentMeta?.provider || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
