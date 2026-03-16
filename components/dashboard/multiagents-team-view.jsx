import AddRounded from "@mui/icons-material/AddRounded";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import WidgetsRounded from "@mui/icons-material/WidgetsRounded";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiagentsChatSystem } from "@/components/dashboard/multiagents-chat-system";
import { MultiagentsDeleteAgentModal } from "@/components/dashboard/multiagents-delete-agent-modal";
import { MultiagentsEventsPanel } from "@/components/dashboard/multiagents-events-panel";
import { MultiagentsGroupMeetingModal } from "@/components/dashboard/multiagents-group-meeting-modal";
import { MultiagentsTaskBoard } from "@/components/dashboard/multiagents-task-board";
import { MultiagentsTaskCreateModal } from "@/components/dashboard/multiagents-task-create-modal";
import { MultiagentsTaskDetailModal } from "@/components/dashboard/multiagents-task-detail-modal";
import { MultiagentsViewToggle } from "@/components/dashboard/multiagents-view-toggle";
import { OfficeEditorModal } from "@/components/dashboard/office-editor-modal";
import { OFFICE_LAYOUT_STORAGE_KEY, createDefaultOfficeLayout, normalizeOfficeLayout } from "@/components/dashboard/office-layout";
import { OfficeScene } from "@/components/dashboard/office-scene";

const STATUS_META = {
  responding: {
    label: "Con actividad",
    dot: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  loading: {
    label: "Consultando",
    dot: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
  },
  idle: {
    label: "En espera",
    dot: "bg-neutral-300",
    chip: "border-neutral-200 bg-neutral-100 text-neutral-600",
  },
};

function getAgentStatus(agentId, busyAgentId, teamNotes) {
  if (busyAgentId === agentId) return STATUS_META.loading;
  if (teamNotes[agentId]) return STATUS_META.responding;
  return STATUS_META.idle;
}

function formatSyncLabel(lastSyncAt) {
  if (!lastSyncAt) return "--:--";
  return new Date(lastSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MultiagentsTeamView({
  agents,
  bindings,
  tasks,
  loading,
  refreshing,
  defaultModel,
  teamNotes,
  speechBubbles,
  teamEvents,
  chatSessions,
  chatBusyAgentId,
  busyAgentId,
  meetingState,
  onRunGroupMeeting,
  onStopMeeting,
  onRefresh,
  onOpenCreate,
  onSendChat,
  onClearChat,
  onDeleteAgent,
  onUpdateAgentModel,
  onCreateTask,
  onUpdateTask,
  onRunTask,
  onDeleteTask,
  runningTaskId,
  updatingModelAgentId,
  lastSyncAt,
}) {
  const [selectedId, setSelectedId] = useState("");
  const [officeEditorOpen, setOfficeEditorOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openChatIds, setOpenChatIds] = useState([]);
  const [minimizedChats, setMinimizedChats] = useState({});
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [view, setView] = useState("control");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [officeLayout, setOfficeLayout] = useState(createDefaultOfficeLayout());
  const [officeReady, setOfficeReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(OFFICE_LAYOUT_STORAGE_KEY);
      if (saved) setOfficeLayout(normalizeOfficeLayout(JSON.parse(saved)));
    } catch {}
    setOfficeReady(true);
  }, []);

  useEffect(() => {
    if (!officeReady) return;
    window.localStorage.setItem(OFFICE_LAYOUT_STORAGE_KEY, JSON.stringify(officeLayout));
  }, [officeLayout, officeReady]);

  useEffect(() => {
    if (!agents.length) return;
    if (!selectedId || !agents.some((agent) => agent.id === selectedId)) setSelectedId(agents[0].id);
  }, [agents, selectedId]);

  useEffect(() => {
    setOpenChatIds((current) => current.filter((id) => agents.some((agent) => agent.id === id)));
    setMinimizedChats((current) => Object.fromEntries(Object.entries(current).filter(([id]) => agents.some((agent) => agent.id === id))));
  }, [agents]);

  useEffect(() => {
    if (!tasks.length) return;
    if (!selectedTaskId || !tasks.some((task) => task.id === selectedTaskId)) setSelectedTaskId(tasks[0].id);
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (!tasks.length) setTaskDetailOpen(false);
  }, [tasks]);

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedId) || agents[0], [agents, selectedId]);
  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) || tasks[0] || null, [tasks, selectedTaskId]);
  const syncLabel = formatSyncLabel(lastSyncAt);
  const meetingLive = ["running", "stopping"].includes(meetingState?.status || "");
  const selectedAgentEvents = useMemo(() => (selectedAgent ? teamEvents.filter((event) => event.agentId === selectedAgent.id) : []), [selectedAgent, teamEvents]);
  const meetingEvents = useMemo(() => teamEvents.filter((event) => event.kind === "meeting" || event.kind === "meeting-status"), [teamEvents]);

  function handleExportChat(agentId = selectedAgent?.id) {
    const agent = agents.find((item) => item.id === agentId);
    if (!agent) return;
    const payload = {
      agentId: agent.id,
      name: agent.identityName || agent.id,
      model: agent.model || defaultModel,
      exportedAt: new Date().toISOString(),
      messages: chatSessions[agent.id] || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${agent.id}-chat.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleDeleteSelectedAgent(agentId = selectedAgent?.id) {
    if (!agentId) return;
    setSelectedId(agentId);
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteAgent() {
    if (!selectedAgent) return;
    try {
      setDeleting(true);
      await onDeleteAgent(selectedAgent.id);
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleRunGroupMeeting(agentIds, config) {
    try {
      setGroupSubmitting(true);
      await onRunGroupMeeting(agentIds, config);
      setGroupOpen(false);
    } finally {
      setGroupSubmitting(false);
    }
  }

  function handleOpenTask(taskId) {
    setSelectedTaskId(taskId);
    setTaskDetailOpen(true);
  }

  return (
    <>
      <MultiagentsDeleteAgentModal
        open={deleteConfirmOpen}
        agentName={selectedAgent?.identityName || selectedAgent?.id || "este agente"}
        deleting={deleting}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => void confirmDeleteAgent()}
      />

      <MultiagentsTaskCreateModal open={taskCreateOpen} onClose={() => setTaskCreateOpen(false)} agents={agents} creating={false} onCreateTask={onCreateTask} />

      <MultiagentsGroupMeetingModal open={groupOpen} agents={agents} submitting={groupSubmitting} onClose={() => setGroupOpen(false)} onSubmit={handleRunGroupMeeting} />

      <div className="space-y-4 pb-[124px]">
        <Card className="overflow-hidden rounded-lg">
          <CardHeader className="border-b border-neutral-200 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                  {view === "control" ? <WidgetsRounded sx={{ fontSize: 15 }} /> : <ApartmentRounded sx={{ fontSize: 15 }} />}
                  {view === "control" ? "Control View" : "Office View"}
                </div>
                <CardTitle className="mt-1 text-lg tracking-tight text-neutral-950">{view === "control" ? "Operational control" : "Operational floor"}</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MultiagentsViewToggle view={view} setView={setView} />
                <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-500">
                  Sync {syncLabel}
                  {refreshing ? " - actualizando" : ""}
                </div>
                <Button variant="outline" size="sm" onClick={onOpenCreate}>
                  <SmartToyRounded sx={{ fontSize: 16 }} />
                  Crear agente
                </Button>
                {view === "control" ? (
                  <Button variant="outline" size="sm" onClick={() => setTaskCreateOpen(true)}>
                    <AddRounded sx={{ fontSize: 16 }} />
                    Nueva tarea
                  </Button>
                ) : null}
                {meetingLive ? (
                  <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-700">
                    Reunion en curso - vuelta {meetingState.currentRound || 1}/{meetingState.rounds || 1}
                    {meetingState.currentAgentId ? ` - habla ${meetingState.currentAgentId}` : ""}
                  </div>
                ) : null}
                <Button variant="outline" size="icon" onClick={() => onRefresh({ background: true })} aria-label="Actualizar flota">
                  <SyncRounded sx={{ fontSize: 16 }} />
                </Button>
                {view === "office" ? (
                  <Button variant="outline" size="sm" onClick={() => setOfficeEditorOpen(true)}>
                    <EditRounded sx={{ fontSize: 16 }} />
                    Editar oficina
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-5">
            {view === "control" ? (
              <div className="space-y-4">
                {loading && !agents.length ? <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">Cargando agentes...</div> : null}

                <MultiagentsTaskBoard tasks={tasks} agents={agents} selectedTaskId={selectedTask?.id || ""} onOpenTask={handleOpenTask} />

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_0.85fr]">
                  <MultiagentsEventsPanel
                    title={meetingLive ? "Reunion en vivo" : "Global Activity"}
                    teamEvents={meetingLive ? meetingEvents : teamEvents}
                    emptyText={meetingLive ? "La reunion aun no genero mensajes." : "Todavia no hay eventos globales del equipo."}
                    live={meetingLive}
                  />
                  <MultiagentsEventsPanel title="Agent stream" teamEvents={selectedAgentEvents} emptyText="Todavia no hay eventos del agente seleccionado." defaultCollapsed />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <OfficeScene
                  layout={officeLayout}
                  agents={agents}
                  selectedAgentId={selectedAgent?.id || ""}
                  setSelectedAgentId={setSelectedId}
                  teamNotes={teamNotes}
                  speechBubbles={speechBubbles}
                  busyAgentId={busyAgentId}
                />
                {loading && !agents.length ? <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">Cargando oficina...</div> : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MultiagentsChatSystem
        agents={agents}
        openChatIds={openChatIds}
        setOpenChatIds={setOpenChatIds}
        minimizedChats={minimizedChats}
        setMinimizedChats={setMinimizedChats}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        busyAgentId={busyAgentId}
        teamNotes={teamNotes}
        chatSessions={chatSessions}
        defaultModel={defaultModel}
        updatingModelAgentId={updatingModelAgentId}
        onUpdateAgentModel={onUpdateAgentModel}
        onClearChat={onClearChat}
        onExportChat={handleExportChat}
        onDeleteAgent={handleDeleteSelectedAgent}
        onSendChat={onSendChat}
        chatBusyAgentId={chatBusyAgentId}
        getAgentStatus={getAgentStatus}
      />

      <MultiagentsTaskDetailModal
        open={taskDetailOpen}
        task={selectedTask}
        agents={agents}
        onClose={() => setTaskDetailOpen(false)}
        onUpdateTask={onUpdateTask}
        onRunTask={onRunTask}
        onDeleteTask={onDeleteTask}
        runningTaskId={runningTaskId}
      />

      <OfficeEditorModal open={officeEditorOpen} onClose={() => setOfficeEditorOpen(false)} draftLayout={officeLayout} setDraftLayout={setOfficeLayout} />
    </>
  );
}
