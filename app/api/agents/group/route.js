import { NextResponse } from "next/server";
import { openclawProfileCommand, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

function normalizeAgentId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function getStore() {
  if (!globalThis.__openclawMeetingSessions) {
    globalThis.__openclawMeetingSessions = new Map();
  }
  return globalThis.__openclawMeetingSessions;
}

async function askAgent(agentId, prompt) {
  const cmd = `${openclawProfileCommand(`agent --agent ${shellEscape(agentId)} --message ${shellEscape(prompt)} --json`)} 2>/dev/null`;
  const { stdout } = await runRemote(cmd);
  const parsed = JSON.parse(stdout || "{}");
  const payloads = parsed?.result?.payloads || [];
  return payloads.map((item) => item?.text).filter(Boolean).join("\n\n").trim() || "Sin respuesta";
}

function buildInstructionBlock({ meetingType, outputStyle, agenda }) {
  const meetingLine = meetingType === "brainstorm"
    ? "La meta es abrir opciones y comparar enfoques posibles."
    : meetingType === "review"
      ? "La meta es revisar riesgos, huecos y calidad de la solucion."
      : meetingType === "handoff"
        ? "La meta es transferir contexto y dejar siguientes pasos claros."
        : "La meta es coordinar trabajo y alinear decisiones entre agentes.";

  const outputLine = outputStyle === "brief"
    ? "Responde en 1 o 2 frases muy cortas."
    : outputStyle === "critical"
      ? "Prioriza riesgos, objeciones y advertencias concretas."
      : outputStyle === "planning"
        ? "Prioriza plan, tareas y siguientes pasos concretos."
        : "Prioriza una respuesta accionable, concreta y util.";

  return [
    meetingLine,
    outputLine,
    agenda ? `Agenda adicional:\n${agenda}` : "",
    "Responde en espanol, como parte de un equipo que colabora de verdad.",
    "Maximo 3 frases. Evita relleno.",
  ].filter(Boolean).join("\n\n");
}

function createSession(body) {
  const topic = String(body.topic || "").trim();
  const rounds = Math.min(6, Math.max(1, Number(body.rounds || 2)));
  const meetingType = String(body.meetingType || "coordination").trim();
  const outputStyle = String(body.outputStyle || "actionable").trim();
  const agenda = String(body.agenda || "").trim();
  const agentIds = Array.isArray(body.agentIds)
    ? body.agentIds.map(normalizeAgentId).filter(Boolean)
    : [];

  if (!topic) throw new Error("Falta el tema de la reunion.");
  if (agentIds.length < 2) throw new Error("Selecciona al menos dos agentes.");

  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: sessionId,
    topic,
    rounds,
    meetingType,
    outputStyle,
    agenda,
    agentIds,
    status: "running",
    transcript: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currentRound: 0,
    currentAgentId: "",
    stopRequested: false,
    error: "",
  };
}

async function runMeeting(session) {
  const instructions = buildInstructionBlock(session);
  try {
    for (let round = 1; round <= session.rounds; round += 1) {
      session.currentRound = round;
      for (const agentId of session.agentIds) {
        if (session.stopRequested) {
          session.status = "stopped";
          session.updatedAt = Date.now();
          return;
        }

        session.currentAgentId = agentId;
        session.updatedAt = Date.now();
        const history = session.transcript.map((entry) => `${entry.agentId}: ${entry.text}`).join("\n");
        const prompt = [
          `Tema de reunion: ${session.topic}`,
          `Participantes: ${session.agentIds.join(", ")}`,
          `Vuelta del equipo: ${round}/${session.rounds}`,
          history ? `Historial hasta ahora:\n${history}` : "Eres quien abre la conversacion.",
          instructions,
          "Aporta una decision, una observacion o un siguiente paso que ayude al equipo.",
        ].join("\n\n");

        const text = await askAgent(agentId, prompt);
        session.transcript.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          agentId,
          text,
          round,
          at: Date.now(),
        });
        session.updatedAt = Date.now();
      }
    }

    session.status = "completed";
    session.currentAgentId = "";
    session.updatedAt = Date.now();
  } catch (error) {
    session.status = "failed";
    session.error = error.message;
    session.currentAgentId = "";
    session.updatedAt = Date.now();
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const session = createSession(body);
    const store = getStore();
    store.set(session.id, session);
    void runMeeting(session);
    return NextResponse.json({ ok: true, sessionId: session.id, session });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = String(searchParams.get("sessionId") || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Falta sessionId." }, { status: 400 });
  }
  const session = getStore().get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "No encontre esa reunion." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, session });
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = String(searchParams.get("sessionId") || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Falta sessionId." }, { status: 400 });
  }
  const session = getStore().get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "No encontre esa reunion." }, { status: 404 });
  }
  session.stopRequested = true;
  session.updatedAt = Date.now();
  if (session.status === "running") {
    session.status = "stopping";
  }
  return NextResponse.json({ ok: true, session });
}
