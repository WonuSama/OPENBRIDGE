"use client";

import BoltRounded from "@mui/icons-material/BoltRounded";
import CleaningServicesRounded from "@mui/icons-material/CleaningServicesRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OpenRouterModelPicker } from "@/components/dashboard/openrouter-model-picker";
import { cn } from "@/lib/utils";

const QUICK_COMMANDS = [
  {
    label: "/status",
    detail: "openclaw --profile nuevo status",
    prompt: "Ejecuta `openclaw --profile nuevo status` y resume el estado actual de este agente.",
  },
  {
    label: "/status-deep",
    detail: "openclaw --profile nuevo status --deep",
    prompt: "Ejecuta `openclaw --profile nuevo status --deep` y marca cualquier riesgo importante para este agente.",
  },
  {
    label: "/probe",
    detail: "openclaw --profile nuevo channels status --probe",
    prompt: "Ejecuta `openclaw --profile nuevo channels status --probe` y dime si el canal y el gateway estan sanos.",
  },
  {
    label: "/logs",
    detail: "openclaw --profile nuevo logs",
    prompt: "Revisa los logs recientes del agente y resume los eventos relevantes.",
  },
];

function formatEventTime(at) {
  if (!at) return "--:--";
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatTray({ agents, openChatIds, selectedId, busyAgentId, teamNotes, getAgentStatus, open, setOpen, onOpenAgent }) {
  return (
    <div className="fixed bottom-0 right-0 z-30 hidden xl:block" style={{ bottom: 0, right: 0 }}>
      {open ? (
        <div className="w-[260px] overflow-hidden rounded-t-lg border border-b-0 border-neutral-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-3 py-3">
            <div className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">Agentes</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-50"
              aria-label="Cerrar bandeja de chats"
            >
              <KeyboardArrowDownRounded sx={{ fontSize: 18 }} />
            </button>
          </div>
          <div className="max-h-[380px] space-y-2 overflow-y-auto px-2 py-2">
            {agents.map((agent) => {
              const active = selectedId === agent.id || openChatIds.includes(agent.id);
              const status = getAgentStatus(agent.id, busyAgentId, teamNotes);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onOpenAgent(agent.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                    active ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-white",
                  )}
                >
                  <div className={cn("truncate text-sm font-medium", active ? "text-white" : "text-neutral-900")}>{agent.identityName || agent.id}</div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className={cn("truncate text-[11px]", active ? "text-white/70" : "text-neutral-500")}>{agent.role || "general"}</div>
                    <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium", status.chip)}>{status.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 min-w-[180px] items-center justify-between gap-3 rounded-t-lg border border-b-0 border-neutral-200 bg-white px-4 text-left shadow-[0_12px_34px_rgba(15,23,42,0.12)] transition-colors hover:bg-neutral-50"
          aria-label="Abrir bandeja de chats"
        >
          <span className="text-sm font-medium text-neutral-900">Agentes</span>
          <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600">{agents.length}</span>
        </button>
      )}
    </div>
  );
}

function AgentChatWindow({
  agent,
  status,
  messages,
  defaultModel,
  updatingModelAgentId,
  onUpdateAgentModel,
  onClearChat,
  onExportChat,
  onDeleteAgent,
  onSendChat,
  busy,
  rightOffset,
  onMinimize,
  onClose,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const chatScrollRef = useRef(null);
  const menuRef = useRef(null);
  const quickRef = useRef(null);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    function onDocumentClick(event) {
      if (menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
      setModelMenuOpen(false);
    }
    if (!menuOpen) return undefined;
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [menuOpen]);

  useEffect(() => {
    function onDocumentClick(event) {
      if (quickRef.current?.contains(event.target)) return;
      setQuickOpen(false);
    }
    if (!quickOpen) return undefined;
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [quickOpen]);

  async function handleSend() {
    const text = String(draft || "").trim();
    if (!text) return;
    setDraft("");
    await onSendChat(agent.id, text);
  }

  return (
    <div
      className="fixed bottom-0 z-40 hidden w-[340px] overflow-hidden rounded-t-lg border border-b-0 border-neutral-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)] xl:block"
      style={{ bottom: 0, right: rightOffset }}
    >
      <div className="border-b border-neutral-200 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-neutral-950">{agent.identityName || agent.id}</div>
            <div className="mt-1">
              <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-medium", status.chip)}>{status.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-50"
                aria-label="Opciones del agente"
              >
                <MoreHorizRounded sx={{ fontSize: 16 }} />
              </button>
              {menuOpen ? (
                <div className="absolute bottom-[calc(100%+0.45rem)] right-0 z-20 min-w-[260px] rounded-lg border border-neutral-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <button
                    type="button"
                    onClick={() => setModelMenuOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <SmartToyRounded sx={{ fontSize: 16 }} />
                      Cambiar modelo
                    </span>
                    {updatingModelAgentId === agent.id ? <span className="text-[11px] text-neutral-400">Guardando...</span> : null}
                  </button>
                  {modelMenuOpen ? (
                    <div className="px-2 pb-2 pt-1">
                      <OpenRouterModelPicker
                        compact
                        value={agent.model}
                        defaultModel={defaultModel}
                        buttonLabel="Modelo"
                        popoverClassName="right-0 left-auto w-[680px]"
                        onChange={(nextModel) => {
                          void onUpdateAgentModel(agent.id, nextModel);
                          setModelMenuOpen(false);
                          setMenuOpen(false);
                        }}
                      />
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      onClearChat(agent.id);
                      setMenuOpen(false);
                      setModelMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <CleaningServicesRounded sx={{ fontSize: 16 }} />
                    Limpiar chat
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportChat(agent.id)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <SyncRounded sx={{ fontSize: 16 }} />
                    Exportar chat actual
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAgent(agent.id)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <CleaningServicesRounded sx={{ fontSize: 16 }} />
                    Eliminar agente
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onMinimize}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-50"
              aria-label="Minimizar chat"
            >
              <KeyboardArrowDownRounded sx={{ fontSize: 18 }} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-50"
              aria-label="Cerrar chat"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div ref={chatScrollRef} className="h-[320px] space-y-3 overflow-y-auto bg-neutral-50/60 px-4 py-4">
        {messages.length ? (
          messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[84%]" : "max-w-[88%]"}>
              <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-neutral-400">
                <span>{message.role === "user" ? "Tu" : message.role === "system" ? message.kind || "log" : agent.identityName || agent.id}</span>
                <span>{formatEventTime(message.at)}</span>
              </div>
              <div
                className={
                  message.role === "user"
                    ? "rounded-lg rounded-br-sm bg-[#e9f0fb] px-4 py-3 text-sm leading-6 text-neutral-900 break-words whitespace-pre-wrap"
                    : message.role === "system"
                      ? "rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-neutral-600 break-words whitespace-pre-wrap"
                      : message.error
                        ? "rounded-lg rounded-bl-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 break-words whitespace-pre-wrap"
                        : "rounded-lg rounded-bl-sm border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-neutral-900 break-words whitespace-pre-wrap"
                }
              >
                {message.content}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-500">Todavia no hay actividad ni conversacion con este agente.</div>
        )}
      </div>

      <div className="border-t border-neutral-200 px-4 py-3">
        <div ref={quickRef} className="relative mb-3">
          <Button variant="outline" className="w-full justify-between text-neutral-700" onClick={() => setQuickOpen((current) => !current)}>
            <span className="inline-flex items-center gap-2">
              <BoltRounded sx={{ fontSize: 16 }} />
              Comandos rapidos
            </span>
            <KeyboardArrowDownRounded sx={{ fontSize: 18 }} />
          </Button>
          {quickOpen ? (
            <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-20 rounded-lg border border-neutral-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              {QUICK_COMMANDS.map((command) => (
                <div key={command.label} className="flex items-start gap-2 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(command.prompt);
                      setQuickOpen(false);
                    }}
                    className="flex-1 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
                  >
                    <div className="font-mono text-sm text-neutral-900">{command.label}</div>
                    <div className="mt-1 text-xs text-neutral-500">{command.detail}</div>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => void onSendChat(agent.id, command.prompt)}>
                    Usar
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-3">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe un mensaje"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSend();
            }}
          />
          <Button onClick={() => void handleSend()} disabled={busy}>
            {busy ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MultiagentsChatSystem({
  agents,
  openChatIds,
  setOpenChatIds,
  minimizedChats,
  setMinimizedChats,
  selectedId,
  setSelectedId,
  busyAgentId,
  teamNotes,
  chatSessions,
  defaultModel,
  updatingModelAgentId,
  onUpdateAgentModel,
  onClearChat,
  onExportChat,
  onDeleteAgent,
  onSendChat,
  chatBusyAgentId,
  getAgentStatus,
}) {
  const [trayOpen, setTrayOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function openAgentChat(agentId) {
    setSelectedId(agentId);
    setOpenChatIds((current) => (current.includes(agentId) ? current : [...current, agentId]));
    setMinimizedChats((current) => ({ ...current, [agentId]: false }));
  }

  function closeAgentChat(agentId) {
    setOpenChatIds((current) => current.filter((id) => id !== agentId));
    setMinimizedChats((current) => {
      const next = { ...current };
      delete next[agentId];
      return next;
    });
  }

  function minimizeAgentChat(agentId) {
    setMinimizedChats((current) => ({ ...current, [agentId]: true }));
  }

  function restoreAgentChat(agentId) {
    setSelectedId(agentId);
    setMinimizedChats((current) => ({ ...current, [agentId]: false }));
  }

  const railWidth = trayOpen ? 260 : 180;
  const railOffset = railWidth;
  const maxVisibleChats = viewportWidth >= 1280 ? Math.max(1, Math.floor((viewportWidth - railOffset - 72) / 352)) : 1;
  const requestedVisible = openChatIds.filter((agentId) => !minimizedChats[agentId]);
  const visibleChatIds = requestedVisible.slice(-maxVisibleChats);
  const overflowChatIds = requestedVisible.slice(0, Math.max(0, requestedVisible.length - maxVisibleChats));
  const minimizedIds = openChatIds.filter((agentId) => minimizedChats[agentId] && !overflowChatIds.includes(agentId));
  const dockTabs = [...overflowChatIds, ...minimizedIds];

  return (
    <>
      <ChatTray
        agents={agents}
        openChatIds={openChatIds}
        selectedId={selectedId}
        busyAgentId={busyAgentId}
        teamNotes={teamNotes}
        getAgentStatus={getAgentStatus}
        open={trayOpen}
        setOpen={setTrayOpen}
        onOpenAgent={openAgentChat}
      />

      {visibleChatIds.map((agentId, index) => {
        const agent = agents.find((item) => item.id === agentId);
        if (!agent) return null;
        return (
          <AgentChatWindow
            key={agentId}
            agent={agent}
            status={getAgentStatus(agent.id, busyAgentId, teamNotes)}
            messages={chatSessions[agentId] || []}
            defaultModel={defaultModel}
            updatingModelAgentId={updatingModelAgentId}
            onUpdateAgentModel={onUpdateAgentModel}
            onClearChat={onClearChat}
            onExportChat={onExportChat}
            onDeleteAgent={onDeleteAgent}
            onSendChat={onSendChat}
            busy={chatBusyAgentId === agentId}
            rightOffset={railOffset + (visibleChatIds.length - index - 1) * 352}
            onMinimize={() => minimizeAgentChat(agentId)}
            onClose={() => closeAgentChat(agentId)}
          />
        );
      })}

      {dockTabs.length ? (
        <div className="fixed bottom-0 z-40 hidden items-end gap-2 xl:flex" style={{ bottom: 0, right: railOffset }}>
          {dockTabs.map((agentId) => {
            const agent = agents.find((item) => item.id === agentId);
            if (!agent) return null;
            const status = getAgentStatus(agent.id, busyAgentId, teamNotes);
            return (
              <button
                key={agentId}
                type="button"
                onClick={() => restoreAgentChat(agentId)}
                className="min-w-[180px] rounded-t-lg border border-b-0 border-neutral-200 bg-white px-4 py-3 text-left shadow-[0_16px_48px_rgba(15,23,42,0.1)] transition-colors hover:bg-neutral-50"
              >
                <div className="truncate text-sm font-medium text-neutral-900">{agent.identityName || agent.id}</div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
                  <span className="truncate">{agent.role || "general"}</span>
                  <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium", status.chip)}>{status.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
