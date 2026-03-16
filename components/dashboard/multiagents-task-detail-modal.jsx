"use client";

import BoltRounded from "@mui/icons-material/BoltRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TASK_COLUMNS } from "@/components/dashboard/multiagents-task-board";

function formatEventTime(at) {
  if (!at) return "--:--";
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TaskDetailPanel({ task, agents, onUpdateTask, onRunTask, onDeleteTask, runningTaskId }) {
  const [updateText, setUpdateText] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    setUpdateText("");
    setHistoryOpen(false);
  }, [task?.id]);

  if (!task) {
    return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-5 text-sm text-neutral-500">Selecciona una tarea para ver su detalle.</div>;
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-neutral-950">{task.title}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.12em] text-neutral-400">{task.priority} - iteracion {task.iterationCount || 0}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => void onRunTask(task.id)} disabled={!task.assigneeAgentId || runningTaskId === task.id}>
            <BoltRounded sx={{ fontSize: 15 }} />
            {runningTaskId === task.id ? "Ejecutando..." : "Ejecutar tarea"}
          </Button>
          <button
            type="button"
            onClick={() => void onDeleteTask(task.id)}
            className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      {task.brief ? <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-6 text-neutral-600">{task.brief}</div> : null}

      {task.lastRunSummary ? (
        <div className="mt-4 rounded-md border border-neutral-200 bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.12em] text-neutral-400">
            <span>{task.lastRunBy || "agente"}</span>
            <span>{task.lastRunAt ? formatEventTime(task.lastRunAt) : "--:--"}</span>
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{task.lastRunSummary}</div>
        </div>
      ) : null}

      {task.lastError ? <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">{task.lastError}</div> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <select value={task.status} onChange={(event) => void onUpdateTask(task.id, { status: event.target.value })} className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none">
          {TASK_COLUMNS.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
        </select>
        <select value={task.assigneeAgentId || ""} onChange={(event) => void onUpdateTask(task.id, { assigneeAgentId: event.target.value })} className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none">
          <option value="">Sin asignar</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.identityName || agent.id}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-neutral-900">Iteracion y update</div>
          <Button variant="outline" size="sm" onClick={() => void onUpdateTask(task.id, { bumpIteration: true })}>
            <VisibilityRounded sx={{ fontSize: 15 }} />
            Nueva iteracion
          </Button>
        </div>
        <textarea
          value={updateText}
          onChange={(event) => setUpdateText(event.target.value)}
          placeholder="Que avanzo, que se bloqueo o que deberia pasar despues."
          className="min-h-[96px] w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-900 outline-none transition-[color,box-shadow,border-color] placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-[3px] focus-visible:ring-neutral-200"
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              if (!updateText.trim()) return;
              void onUpdateTask(task.id, { updateText: updateText.trim(), author: task.assigneeAgentId || "" });
              setUpdateText("");
            }}
          >
            Guardar update
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-neutral-200 bg-white">
        <button
          type="button"
          onClick={() => setHistoryOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
        >
          <span className="text-sm font-medium text-neutral-900">Historial</span>
          <KeyboardArrowDownRounded
            sx={{
              fontSize: 18,
              transform: historyOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 180ms ease",
            }}
          />
        </button>
        {historyOpen ? (
          <div className="space-y-2 border-t border-neutral-200 px-3 py-3">
            {task.updates?.length ? (
              task.updates.slice(0, 8).map((update) => (
                <div key={update.id} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.12em] text-neutral-400">
                    <span>{update.author || "sistema"}</span>
                    <span>{formatEventTime(update.at)}</span>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-neutral-600">{update.text}</div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">Todavia no hay updates guardados para esta tarea.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MultiagentsTaskDetailModal({ open, task, agents, onClose, onUpdateTask, onRunTask, onDeleteTask, runningTaskId }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/20 backdrop-blur-[2px]">
      <div className="flex min-h-full items-center justify-center px-4">
        <div className="flex max-h-[min(100vh-2rem,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div className="text-base font-semibold text-neutral-950">Detalle de tarea</div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
          <div className="overflow-y-auto px-5 py-5">
            <TaskDetailPanel task={task} agents={agents} onUpdateTask={onUpdateTask} onRunTask={onRunTask} onDeleteTask={onDeleteTask} runningTaskId={runningTaskId} />
          </div>
        </div>
      </div>
    </div>
  );
}
