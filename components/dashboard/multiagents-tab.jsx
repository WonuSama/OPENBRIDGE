import { useEffect, useRef, useState } from "react";
import { api } from "@/components/dashboard/utils";
import { MultiagentsCreateModal } from "@/components/dashboard/multiagents-create-modal";
import { MultiagentsTeamView } from "@/components/dashboard/multiagents-team-view";

function sanitizeId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function MultiagentsTab() {
  const [agents, setAgents] = useState([]);
  const [bindings, setBindings] = useState([]);
  const [defaults, setDefaults] = useState({ model: { primary: "openrouter/google/gemini-2.5-pro" } });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingModelAgentId, setUpdatingModelAgentId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [teamNotes, setTeamNotes] = useState({});
  const [speechBubbles, setSpeechBubbles] = useState({});
  const [teamEvents, setTeamEvents] = useState([]);
  const [chatSessions, setChatSessions] = useState({});
  const [tasks, setTasks] = useState([]);
  const [runningTaskId, setRunningTaskId] = useState("");
  const [chatBusyAgentId, setChatBusyAgentId] = useState("");
  const [busyAgentId, setBusyAgentId] = useState("");
  const [meetingState, setMeetingState] = useState({ sessionId: "", status: "idle", topic: "", agentIds: [], transcriptCount: 0, currentRound: 0, rounds: 0, currentAgentId: "", error: "" });
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [builder, setBuilder] = useState({
    templateId: "morning-briefing",
    id: "morning-briefing",
    name: "Morning Briefing",
    role: "Daily Briefing Agent",
    model: "openrouter/google/gemini-2.5-pro",
    emoji: ":brain:",
    vibe: "Focused and useful",
    instructions: "",
  });
  const previousAgentIdsRef = useRef([]);

  function pushTeamEvent(message, tone = "info", agentId = "", extra = {}) {
    setTeamEvents((current) => [{ id: extra.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, message, tone, at: extra.at || Date.now(), agentId, kind: extra.kind || "event", speaker: extra.speaker || "" }, ...current].slice(0, 120));
  }

  function appendAgentLog(agentId, content, extra = {}) {
    if (!agentId || !content) return;
    setChatSessions((current) => ({
      ...current,
      [agentId]: [
        ...(current[agentId] || []),
        {
          id: extra.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: extra.role || "system",
          content,
          at: extra.at || Date.now(),
          kind: extra.kind || "log",
          error: Boolean(extra.error),
        },
      ],
    }));
  }

  function ingestMeetingEntries(entries) {
    for (const entry of entries) {
      const content = entry.text || "Sin respuesta";
      setSpeechBubbles((current) => ({ ...current, [entry.agentId]: content }));
      setChatSessions((current) => ({
        ...current,
        [entry.agentId]: [
          ...(current[entry.agentId] || []),
          {
            id: entry.id,
            role: "assistant",
            content,
            at: entry.at,
          },
        ],
      }));
      pushTeamEvent(content, "good", entry.agentId, {
        id: entry.id,
        at: entry.at,
        kind: "meeting",
        speaker: entry.agentId,
      });
    }
  }

  async function loadAgents(options = {}) {
    const background = Boolean(options.background);
    if (background && agents.length) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setError("");
    }

    try {
      const data = await api("/api/agents");
      const nextAgents = data.agents || [];
      const incomingIds = nextAgents.map((agent) => agent.id);
      const previousIds = previousAgentIdsRef.current;
      if (previousIds.length) {
        incomingIds.filter((id) => !previousIds.includes(id)).forEach((id) => pushTeamEvent(`${id} se conecto al equipo.`, "good", id));
        previousIds.filter((id) => !incomingIds.includes(id)).forEach((id) => pushTeamEvent(`${id} dejo de aparecer en la flota.`, "warn", id));
      }
      previousAgentIdsRef.current = incomingIds;
      setAgents(nextAgents);
      setBindings(data.bindings || []);
      setDefaults(data.defaults || { model: { primary: "openrouter/google/gemini-2.5-pro" } });
      const defaultModel = data.defaults?.model?.primary || "openrouter/google/gemini-2.5-pro";
      setBuilder((current) => ({ ...current, model: current.model || defaultModel }));
      setLastSyncAt(Date.now());
    } catch (err) {
      setError(err.message);
      if (!background) {
        pushTeamEvent(`No pude refrescar la flota: ${err.message}`, "warn");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadTasks() {
    try {
      const data = await api("/api/multiagents/tasks");
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message);
      pushTeamEvent(`No pude cargar tareas: ${err.message}`, "warn");
    }
  }

  useEffect(() => {
    loadAgents();
    loadTasks();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadAgents({ background: true });
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!meetingState.sessionId || !["running", "stopping"].includes(meetingState.status)) return undefined;

    let active = true;
    const intervalId = window.setInterval(async () => {
      try {
        const data = await api(`/api/agents/group?sessionId=${encodeURIComponent(meetingState.sessionId)}`);
        if (!active) return;
        const session = data.session;
        const transcript = session.transcript || [];
        const nextEntries = transcript.slice(meetingState.transcriptCount);
        if (nextEntries.length) {
          ingestMeetingEntries(nextEntries);
        }
        setMeetingState((current) => ({
          ...current,
          status: session.status,
          currentRound: session.currentRound || 0,
          rounds: session.rounds || current.rounds,
          currentAgentId: session.currentAgentId || "",
          error: session.error || "",
          transcriptCount: transcript.length,
        }));
        if (["completed", "stopped", "failed"].includes(session.status)) {
          if (session.status === "completed") {
            pushTeamEvent(`La reunion sobre "${session.topic}" termino.`, "good", "", { kind: "meeting-status" });
          }
          if (session.status === "stopped") {
            pushTeamEvent(`La reunion sobre "${session.topic}" fue detenida.`, "warn", "", { kind: "meeting-status" });
          }
          if (session.status === "failed") {
            pushTeamEvent(`La reunion fallo: ${session.error || "sin detalle"}`, "warn", "", { kind: "meeting-status" });
          }
        }
      } catch (err) {
        if (!active) return;
        setMeetingState((current) => ({ ...current, status: "failed", error: err.message }));
        pushTeamEvent(`No pude seguir la reunion: ${err.message}`, "warn");
      }
    }, 1800);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [meetingState.sessionId, meetingState.status, meetingState.transcriptCount]);

  const defaultModel = defaults?.model?.primary || "openrouter/google/gemini-2.5-pro";

  function pickPreset(preset) {
    setBuilder({
      templateId: preset.id,
      id: preset.id,
      name: preset.title || preset.name || preset.id,
      role: preset.role,
      model: defaultModel,
      emoji: ":brain:",
      vibe: "Focused and useful",
      instructions: "",
    });
  }

  async function createAgent() {
    const id = sanitizeId(builder.id);
    if (!id) return;
    setCreating(true);
    setError("");
    try {
      await api("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: builder.name, role: builder.role, model: builder.model || defaultModel, emoji: builder.emoji, vibe: builder.vibe, instructions: builder.instructions }),
      });
      await loadAgents();
      pushTeamEvent(`Agente ${builder.name || id} creado sobre .openclaw-nuevo.`, "good", id);
      setCreateOpen(false);
    } catch (err) {
      setError(err.message);
      pushTeamEvent(`No pude crear ${id}: ${err.message}`, "warn");
    } finally {
      setCreating(false);
    }
  }

  async function createTask(payload) {
    const title = String(payload?.title || "").trim();
    if (!title) return;
    const data = await api("/api/multiagents/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setTasks((current) => [data.task, ...current]);
    pushTeamEvent(`Nueva tarea creada: ${data.task.title}`, "good", data.task.assigneeAgentId || "");
    if (data.task.assigneeAgentId) {
      appendAgentLog(data.task.assigneeAgentId, `Se te asigno una tarea nueva: ${data.task.title}`, { kind: "task" });
      await runTask(data.task.id);
    }
  }

  async function updateTask(taskId, patch) {
    const data = await api("/api/multiagents/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, ...patch }),
    });
    setTasks((current) => current.map((task) => (task.id === taskId ? data.task : task)));
    if (data.task?.assigneeAgentId) {
      const updates = [];
      if (patch.status !== undefined) updates.push(`Estado de tarea cambiado a ${data.task.status}.`);
      if (patch.assigneeAgentId !== undefined) updates.push(`Asignacion actual: ${data.task.assigneeAgentId || "sin asignar"}.`);
      if (patch.bumpIteration) updates.push(`Nueva iteracion abierta para ${data.task.title}.`);
      if (patch.updateText) updates.push(`Update guardado en ${data.task.title}: ${patch.updateText}`);
      if (updates.length) {
        appendAgentLog(data.task.assigneeAgentId, updates.join("\n"), { kind: "task" });
      }
    }
    if (patch.assigneeAgentId !== undefined && data.task?.assigneeAgentId && !data.task.lastRunAt) {
      await runTask(taskId);
      return data.task;
    }
    return data.task;
  }

  async function runTask(taskId) {
    if (!taskId) return null;
    setRunningTaskId(taskId);
    try {
      const data = await api("/api/multiagents/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        timeoutMs: 120000,
        body: JSON.stringify({ id: taskId, action: "run" }),
      });
      setTasks((current) => current.map((task) => (task.id === taskId ? data.task : task)));
      if (data.task?.assigneeAgentId) {
        setTeamNotes((current) => ({ ...current, [data.task.assigneeAgentId]: data.output || current[data.task.assigneeAgentId] || "" }));
        setSpeechBubbles((current) => ({ ...current, [data.task.assigneeAgentId]: data.output || current[data.task.assigneeAgentId] || "" }));
        appendAgentLog(data.task.assigneeAgentId, `Se ejecuto la tarea "${data.task.title}".`, { kind: "task" });
        appendAgentLog(data.task.assigneeAgentId, data.output || "Sin respuesta", { id: `task-${Date.now()}`, role: "assistant", kind: "task-result" });
      }
      pushTeamEvent(`La tarea "${data.task?.title || taskId}" se ejecuto con ${data.task?.assigneeAgentId || "un agente"}.`, "good", data.task?.assigneeAgentId || "");
      return data.task;
    } catch (err) {
      setError(err.message);
      pushTeamEvent(`No pude ejecutar la tarea: ${err.message}`, "warn");
      throw err;
    } finally {
      setRunningTaskId("");
    }
  }

  async function deleteTask(taskId) {
    await api(`/api/multiagents/tasks?id=${encodeURIComponent(taskId)}`, { method: "DELETE" });
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  async function pingAgent(agentId) {
    setBusyAgentId(agentId);
    try {
      const data = await api("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, message: "Resume tu foco actual y tu siguiente paso en una sola respuesta corta." }),
      });
      const text = data.text || "Sin respuesta";
      setTeamNotes((current) => ({ ...current, [agentId]: text }));
      setSpeechBubbles((current) => ({ ...current, [agentId]: text }));
      appendAgentLog(agentId, "Pulso operativo solicitado.", { kind: "pulse" });
      appendAgentLog(agentId, text, { role: "assistant", kind: "pulse-result" });
      pushTeamEvent(`${agentId} respondio con un pulso operativo.`, "info", agentId);
    } catch (err) {
      const text = `No pude consultar este agente: ${err.message}`;
      setTeamNotes((current) => ({ ...current, [agentId]: text }));
      setSpeechBubbles((current) => ({ ...current, [agentId]: text }));
      appendAgentLog(agentId, text, { kind: "pulse-error", error: true });
      pushTeamEvent(`Fallo el pulso de ${agentId}.`, "warn", agentId);
    } finally {
      setBusyAgentId("");
    }
  }

  async function sendChat(agentId, message) {
    const text = String(message || "").trim();
    if (!agentId || !text) return;
    const userMessage = { id: `u-${Date.now()}`, role: "user", content: text, at: Date.now() };
    setChatSessions((current) => ({ ...current, [agentId]: [...(current[agentId] || []), userMessage] }));
    setChatBusyAgentId(agentId);
    try {
      const data = await api("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, message: text }),
      });
      const content = data.text || "Sin respuesta";
      const assistantMessage = { id: `a-${Date.now()}`, role: "assistant", content, at: Date.now() };
      setChatSessions((current) => ({ ...current, [agentId]: [...(current[agentId] || []), assistantMessage] }));
      setSpeechBubbles((current) => ({ ...current, [agentId]: content }));
      pushTeamEvent(`${agentId} respondio en el chat dedicado.`, "info", agentId);
    } catch (err) {
      const content = `No pude obtener respuesta: ${err.message}`;
      const errorMessage = { id: `e-${Date.now()}`, role: "assistant", content, at: Date.now(), error: true };
      setChatSessions((current) => ({ ...current, [agentId]: [...(current[agentId] || []), errorMessage] }));
      setSpeechBubbles((current) => ({ ...current, [agentId]: content }));
      pushTeamEvent(`Fallo el chat con ${agentId}.`, "warn", agentId);
    } finally {
      setChatBusyAgentId("");
    }
  }

  function clearChat(agentId) {
    setChatSessions((current) => ({ ...current, [agentId]: [] }));
    pushTeamEvent(`Se limpio el chat de ${agentId}.`, "info", agentId);
  }

  async function deleteAgent(agentId) {
    if (!agentId) return;
    setError("");
    try {
      await api(`/api/agents?id=${encodeURIComponent(agentId)}`, { method: "DELETE" });
      setChatSessions((current) => {
        const next = { ...current };
        delete next[agentId];
        return next;
      });
      setTeamNotes((current) => {
        const next = { ...current };
        delete next[agentId];
        return next;
      });
      setSpeechBubbles((current) => {
        const next = { ...current };
        delete next[agentId];
        return next;
      });
      pushTeamEvent(`${agentId} fue eliminado de .openclaw-nuevo.`, "good", agentId);
      await loadAgents();
    } catch (err) {
      setError(err.message);
      pushTeamEvent(`No pude eliminar ${agentId}: ${err.message}`, "warn");
      throw err;
    }
  }

  async function updateAgentModel(agentId, model) {
    if (!agentId || !model) return;
    setUpdatingModelAgentId(agentId);
    setError("");
    try {
      const data = await api("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agentId, model }),
      });
      setAgents((current) => current.map((agent) => (agent.id === agentId ? { ...agent, model } : agent)));
      pushTeamEvent(data.unchanged ? `El modelo de ${agentId} ya estaba aplicado.` : `Modelo actualizado para ${agentId}.`, "good", agentId);
      await loadAgents({ background: true });
    } catch (err) {
      setError(err.message);
      pushTeamEvent(`No pude cambiar el modelo de ${agentId}: ${err.message}`, "warn", agentId);
      throw err;
    } finally {
      setUpdatingModelAgentId("");
    }
  }

  async function runGroupMeeting(agentIds, config) {
    const normalizedIds = Array.isArray(agentIds) ? agentIds.filter(Boolean) : [];
    const normalizedTopic = String(config?.topic || "").trim();
    if (normalizedIds.length < 2 || !normalizedTopic) return;
    setError("");
    try {
      const data = await api("/api/agents/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentIds: normalizedIds,
          topic: normalizedTopic,
          rounds: Math.min(6, Math.max(1, Number(config?.rounds || 2))),
          meetingType: config?.meetingType || "coordination",
          outputStyle: config?.outputStyle || "actionable",
          agenda: config?.agenda || "",
        }),
      });
      const session = data.session;
      setMeetingState({
        sessionId: data.sessionId,
        status: session.status,
        topic: session.topic,
        agentIds: session.agentIds,
        transcriptCount: 0,
        currentRound: session.currentRound || 0,
        rounds: session.rounds || 0,
        currentAgentId: session.currentAgentId || "",
        error: "",
      });
      pushTeamEvent(`Inicio la reunion: ${session.topic}`, "good", "", { kind: "meeting-status" });
    } catch (err) {
      setError(err.message);
      pushTeamEvent(`Fallo la reunion de grupo: ${err.message}`, "warn");
      throw err;
    }
  }

  async function stopGroupMeeting() {
    if (!meetingState.sessionId) return;
    try {
      await api(`/api/agents/group?sessionId=${encodeURIComponent(meetingState.sessionId)}`, { method: "DELETE" });
      setMeetingState((current) => ({ ...current, status: "stopping" }));
    } catch (err) {
      setError(err.message);
      pushTeamEvent(`No pude detener la reunion: ${err.message}`, "warn");
    }
  }

  return (
    <section className="space-y-4">
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <MultiagentsTeamView
        agents={agents}
        bindings={bindings}
        tasks={tasks}
        loading={loading}
        refreshing={refreshing}
        defaultModel={defaultModel}
        teamNotes={teamNotes}
        speechBubbles={speechBubbles}
        teamEvents={teamEvents}
        chatSessions={chatSessions}
        chatBusyAgentId={chatBusyAgentId}
        busyAgentId={busyAgentId}
        meetingState={meetingState}
        onRunGroupMeeting={runGroupMeeting}
        onStopMeeting={stopGroupMeeting}
        onRefresh={loadAgents}
        onOpenCreate={() => setCreateOpen(true)}
        onSendChat={sendChat}
        onClearChat={clearChat}
        onDeleteAgent={deleteAgent}
        onUpdateAgentModel={updateAgentModel}
        onCreateTask={createTask}
        onUpdateTask={updateTask}
        onRunTask={runTask}
        onDeleteTask={deleteTask}
        runningTaskId={runningTaskId}
        updatingModelAgentId={updatingModelAgentId}
        lastSyncAt={lastSyncAt}
      />

      <MultiagentsCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        builder={builder}
        setBuilder={setBuilder}
        defaultModel={defaultModel}
        creating={creating}
        createAgent={createAgent}
        pickPreset={pickPreset}
      />
    </section>
  );
}
