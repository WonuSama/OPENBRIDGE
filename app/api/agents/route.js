import { NextResponse } from "next/server";
import { getStateRoot, openclawProfileCommand, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

function normalizeAgentId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function normalizeOpenRouterModel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith("openrouter/") ? raw : `openrouter/${raw.replace(/^\/+/, "")}`;
}

export async function GET() {
  try {
    const cmd = [
      `${openclawProfileCommand("agents list --json")} 2>/dev/null`,
      `printf '\n__SPLIT__\n'`,
      `${openclawProfileCommand("agents bindings --json")} 2>/dev/null`,
      `printf '\n__SPLIT2__\n'`,
      `${openclawProfileCommand("config get agents.defaults")} 2>/dev/null`,
    ].join('; ');
    const { stdout } = await runRemote(cmd);
    const [agentsRaw = "[]", rest = ""] = stdout.split("__SPLIT__");
    const [bindingsRaw = "[]", defaultsRaw = "{}"] = rest.split("__SPLIT2__");
    const agents = JSON.parse(agentsRaw.trim() || "[]");
    const bindings = JSON.parse(bindingsRaw.trim() || "[]");
    const defaults = JSON.parse(defaultsRaw.trim() || "{}");
    return NextResponse.json({ agents, bindings, defaults });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const id = normalizeAgentId(body.id);
    const model = normalizeOpenRouterModel(body.model);
    const name = String(body.name || id || "").trim();
    const role = String(body.role || "Asistente especializado").trim();
    const emoji = String(body.emoji || "🧠").trim() || "🧠";
    const vibe = String(body.vibe || "Focused and useful").trim() || "Focused and useful";
    const instructions = String(body.instructions || "").trim();

    if (!id) {
      return NextResponse.json({ error: "Falta id del agente." }, { status: 400 });
    }

    const workspace = `${getStateRoot()}/workspace-${id}`;
    const identity = `# IDENTITY.md - Who Am I?\n\n- **Name:** ${name}\n- **Creature:** ${role}\n- **Vibe:** ${vibe}\n- **Emoji:** ${emoji}\n- **Avatar:**\n`;
    const identityB64 = Buffer.from(identity, "utf8").toString("base64");
    const agentsMd = instructions
      ? `# AGENTS.md\n\n## Mission\n${role}\n\n## Working Style\n${instructions}\n`
      : "";
    const agentsMdB64 = agentsMd ? Buffer.from(agentsMd, "utf8").toString("base64") : "";

    let createCmd = openclawProfileCommand(`agents add ${shellEscape(id)} --workspace ${shellEscape(workspace)} --non-interactive --json`);
    if (model) {
      createCmd += ` --model ${shellEscape(model)}`;
    }

    const createResult = await runRemote(createCmd);
    if (createResult.code !== 0) {
      const message = createResult.stderr.trim() || createResult.stdout.trim() || "No pude crear el agente.";
      const status = /already exists/i.test(message) ? 409 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    let created = {};
    const createdText = createResult.stdout.trim();
    if (createdText) {
      created = JSON.parse(createdText);
    }

    const writeIdentityCmd = [
      `mkdir -p ${shellEscape(workspace)}`,
      `printf %s ${shellEscape(identityB64)} | base64 -d > ${shellEscape(`${workspace}/IDENTITY.md`)}`,
      ...(agentsMdB64 ? [`printf %s ${shellEscape(agentsMdB64)} | base64 -d > ${shellEscape(`${workspace}/AGENTS.md`)}`] : []),
    ].join(" && ");
    const identityResult = await runRemote(writeIdentityCmd);
    if (identityResult.code !== 0) {
      const message = identityResult.stderr.trim() || "El agente se creó, pero no pude guardar IDENTITY.md.";
      return NextResponse.json({ error: message, created, partial: true }, { status: 500 });
    }

    const setIdentityCmd = openclawProfileCommand(`agents set-identity --agent ${shellEscape(id)} --workspace ${shellEscape(workspace)} --from-identity --json`);
    const setIdentityResult = await runRemote(`${setIdentityCmd} 2>/dev/null || true`);

    return NextResponse.json({
      ok: true,
      created,
      setIdentity: setIdentityResult.stdout.trim() || null,
      stderr: [createResult.stderr, identityResult.stderr, setIdentityResult.stderr].filter(Boolean).join("\n").trim(),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = normalizeAgentId(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "Falta id del agente." }, { status: 400 });
    }

    const deleteCmd = openclawProfileCommand(`agents delete ${shellEscape(id)} --force --json`);
    const result = await runRemote(deleteCmd);

    if (result.code !== 0) {
      const message = result.stderr.trim() || result.stdout.trim() || "No pude eliminar el agente.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    let deleted = {};
    const text = result.stdout.trim();
    if (text) {
      deleted = JSON.parse(text);
    }

    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const id = normalizeAgentId(body.id);
    const model = normalizeOpenRouterModel(body.model);

    if (!id) {
      return NextResponse.json({ error: "Falta id del agente." }, { status: 400 });
    }

    if (!model || !model.startsWith("openrouter/")) {
      return NextResponse.json({ error: "El modelo debe ser de OpenRouter." }, { status: 400 });
    }

    const getListResult = await runRemote(`${openclawProfileCommand("config get agents.list")} 2>/dev/null || printf '[]'`);
    const rawList = (getListResult.stdout || "[]").trim() || "[]";
    const currentList = JSON.parse(rawList);
    if (!Array.isArray(currentList)) {
      return NextResponse.json({ error: "La configuración actual de agentes no es válida." }, { status: 500 });
    }
    const index = currentList.findIndex((agent) => normalizeAgentId(agent?.id) === id);

    if (index === -1) {
      return NextResponse.json({ error: "No encontré ese agente en .openclaw-nuevo." }, { status: 404 });
    }

    const nextList = [...currentList];
    const currentAgent = nextList[index] || {};
    if (String(currentAgent.model || "") === model) {
      return NextResponse.json({ ok: true, agent: currentAgent, model, restarted: false, unchanged: true });
    }
    nextList[index] = { ...currentAgent, model };
    const nextJson = JSON.stringify(nextList);

    const setResult = await runRemote(`${openclawProfileCommand(`config set agents.list ${shellEscape(nextJson)} --strict-json`)} 2>/dev/null`);
    if (setResult.code !== 0) {
      const message = setResult.stderr.trim() || setResult.stdout.trim() || "No pude guardar el nuevo modelo del agente.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const restartResult = await runRemote(`${openclawProfileCommand("gateway restart")} >/dev/null 2>&1 || true`);

    return NextResponse.json({
      ok: true,
      agent: nextList[index],
      model,
      restarted: restartResult.code === 0,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
