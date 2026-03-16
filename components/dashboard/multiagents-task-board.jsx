"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export const TASK_COLUMNS = [
  { id: "backlog", title: "Backlog" },
  { id: "ready", title: "Ready" },
  { id: "in_progress", title: "In progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export function MultiagentsTaskBoard({ tasks, agents, selectedTaskId, onOpenTask }) {
  const agentNameById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent.identityName || agent.id])),
    [agents],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {TASK_COLUMNS.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.id);
        return (
          <div key={column.id} className="rounded-lg border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-3">
              <div className="text-sm font-medium text-neutral-900">{column.title}</div>
              <div className="text-xs text-neutral-400">{columnTasks.length}</div>
            </div>
            <div className="space-y-2 p-2">
              {columnTasks.length ? (
                columnTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpenTask(task.id)}
                    className={cn(
                      "w-full rounded-md border px-3 py-3 text-left transition-colors",
                      selectedTaskId === task.id ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200 bg-neutral-50 hover:bg-white",
                    )}
                  >
                    <div className="text-sm font-medium">{task.title}</div>
                    {task.brief ? <div className={cn("mt-1 line-clamp-3 text-xs leading-5", selectedTaskId === task.id ? "text-white/70" : "text-neutral-500")}>{task.brief}</div> : null}
                    <div className={cn("mt-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.12em]", selectedTaskId === task.id ? "text-white/60" : "text-neutral-400")}>
                      <span>{agentNameById.get(task.assigneeAgentId) || "sin asignar"}</span>
                      <span>it. {task.iterationCount || 0}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-neutral-200 px-3 py-4 text-sm text-neutral-400">Sin tareas</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
