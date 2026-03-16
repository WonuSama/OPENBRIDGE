"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MultiagentsTaskCreateModal({ open, onClose, agents, creating, onCreateTask }) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeAgentId, setAssigneeAgentId] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBrief("");
    setPriority("medium");
    setAssigneeAgentId("");
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    const nextTitle = title.trim();
    const nextBrief = brief.trim();
    if (!nextTitle) return;
    await onCreateTask({ title: nextTitle, brief: nextBrief, priority, assigneeAgentId });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[130] bg-black/20 backdrop-blur-[2px]">
      <div className="flex min-h-full items-center justify-center px-4">
        <div className="flex max-h-[min(100vh-2rem,680px)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <div className="text-base font-semibold text-neutral-950">Nueva tarea</div>
              <div className="mt-1 text-sm text-neutral-500">Crea una tarea real y, si ya la asignas, se ejecuta con el agente elegido.</div>
            </div>
            <Button variant="outline" size="sm" onClick={onClose} disabled={creating}>
              Cerrar
            </Button>
          </div>
          <div className="space-y-4 overflow-y-auto px-5 py-5">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Titulo</label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej: Investigar sobre Spec Driven Development" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Brief</label>
              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="Contexto, objetivo, restricciones o entregable esperado."
                className="min-h-[120px] max-h-[240px] w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-900 outline-none transition-[color,box-shadow,border-color] placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-[3px] focus-visible:ring-neutral-200"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Prioridad</label>
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Asignar a</label>
                <select value={assigneeAgentId} onChange={(event) => setAssigneeAgentId(event.target.value)} className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none">
                  <option value="">Sin asignar</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.identityName || agent.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
            <Button variant="outline" onClick={onClose} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={creating || !title.trim()}>
              {creating ? "Creando..." : "Crear tarea"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
