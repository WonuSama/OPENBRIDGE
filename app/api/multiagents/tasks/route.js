import { NextResponse } from "next/server";
import { listMultiagentTasks, writeMultiagentTasks } from "@/lib/multiagents-tasks-store";
import { openclawProfileCommand, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

function makeId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStatus(value) {
  const status = String(value || "backlog").trim().toLowerCase();
  return ["backlog", "ready", "in_progress", "review", "done"].includes(status) ? status : "backlog";
}

function normalizePriority(value) {
  const priority = String(value || "medium").trim().toLowerCase();
  return ["low", "medium", "high", "critical"].includes(priority) ? priority : "medium";
}

async function executeTaskWithAgent(task) {
  if (!task.assigneeAgentId) {
    throw new Error("Asigna un agente antes de ejecutar la tarea.");
  }

  const recentUpdates = Array.isArray(task.updates) ? task.updates.slice(0, 5) : [];
  const prompt = [
    "Trabaja esta tarea del tablero multiagente y responde en espanol.",
    `Titulo: ${task.title}`,
    task.brief ? `Contexto: ${task.brief}` : "",
    recentUpdates.length
      ? `Historial reciente:\n${recentUpdates
          .map((update) => `- ${update.author || "sistema"}: ${update.text}`)
          .join("\n")}`
      : "",
    "Quiero una respuesta operativa con este formato:",
    "1. Avance logrado",
    "2. Riesgo o bloqueo",
    "3. Siguiente paso concreto",
  ]
    .filter(Boolean)
    .join("\n\n");

  const cmd = `${openclawProfileCommand(`agent --agent ${shellEscape(task.assigneeAgentId)} --message ${shellEscape(prompt)} --json`)} 2>/dev/null`;
  const { stdout, stderr, code } = await runRemote(cmd, { timeoutMs: 90000 });
  if (code !== 0) {
    throw new Error(stderr.trim() || stdout.trim() || "No pude ejecutar la tarea con ese agente.");
  }

  const parsed = JSON.parse(stdout || "{}");
  const payloads = parsed?.result?.payloads || [];
  const text = payloads.map((item) => item?.text).filter(Boolean).join("\n\n").trim();
  if (!text) {
    throw new Error("El agente no devolvio salida util para la tarea.");
  }

  return text;
}

export async function GET() {
  try {
    const tasks = await listMultiagentTasks();
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const brief = String(body.brief || "").trim();
    const assigneeAgentId = String(body.assigneeAgentId || "").trim();

    if (!title) {
      return NextResponse.json({ error: "Falta el titulo de la tarea." }, { status: 400 });
    }

    const now = Date.now();
    const task = {
      id: makeId(),
      title,
      brief,
      status: normalizeStatus(body.status),
      assigneeAgentId,
      priority: normalizePriority(body.priority),
      createdAt: now,
      updatedAt: now,
      iterationCount: 0,
      updates: [],
    };

    const tasks = await listMultiagentTasks();
    const nextTasks = [task, ...tasks];
    await writeMultiagentTasks(nextTasks);

    return NextResponse.json({ ok: true, task });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Falta id de la tarea." }, { status: 400 });
    }

    const tasks = await listMultiagentTasks();
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "No encontre esa tarea." }, { status: 404 });
    }

    const current = tasks[index];

    if (String(body.action || "").trim() === "run") {
      const text = await executeTaskWithAgent(current);
      const now = Date.now();
      const next = {
        ...current,
        status: current.status === "backlog" ? "ready" : current.status === "ready" ? "in_progress" : current.status,
        iterationCount: current.iterationCount + 1,
        updatedAt: now,
        lastRunAt: now,
        lastRunBy: current.assigneeAgentId,
        lastRunSummary: text,
        lastError: "",
        updates: [
          {
            id: makeId(),
            text,
            at: now,
            author: current.assigneeAgentId,
            kind: "agent",
          },
          ...(current.updates || []),
        ],
      };

      const nextTasks = [...tasks];
      nextTasks[index] = next;
      await writeMultiagentTasks(nextTasks);
      return NextResponse.json({ ok: true, task: next, executed: true, output: text });
    }

    const next = {
      ...current,
      title: body.title !== undefined ? String(body.title || "").trim() || current.title : current.title,
      brief: body.brief !== undefined ? String(body.brief || "").trim() : current.brief,
      status: body.status !== undefined ? normalizeStatus(body.status) : current.status,
      assigneeAgentId: body.assigneeAgentId !== undefined ? String(body.assigneeAgentId || "").trim() : current.assigneeAgentId,
      priority: body.priority !== undefined ? normalizePriority(body.priority) : current.priority,
      iterationCount: body.bumpIteration ? current.iterationCount + 1 : current.iterationCount,
      updatedAt: Date.now(),
      lastError: body.lastError !== undefined ? String(body.lastError || "").trim() : current.lastError,
    };

    if (body.updateText) {
      next.updates = [
        {
          id: makeId(),
          text: String(body.updateText).trim(),
          at: Date.now(),
          author: String(body.author || "").trim(),
          kind: String(body.updateKind || "note").trim() || "note",
        },
        ...(current.updates || []),
      ];
    }

    const nextTasks = [...tasks];
    nextTasks[index] = next;
    await writeMultiagentTasks(nextTasks);

    return NextResponse.json({ ok: true, task: next });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Falta id de la tarea." }, { status: 400 });
    }

    const tasks = await listMultiagentTasks();
    const nextTasks = tasks.filter((task) => task.id !== id);
    await writeMultiagentTasks(nextTasks);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
