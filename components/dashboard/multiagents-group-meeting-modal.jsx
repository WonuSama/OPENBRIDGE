"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function MultiagentsGroupMeetingModal({ open, agents, submitting, onClose, onSubmit }) {
  const [topic, setTopic] = useState("");
  const [rounds, setRounds] = useState(2);
  const [selectedIds, setSelectedIds] = useState([]);
  const [meetingType, setMeetingType] = useState("coordination");
  const [outputStyle, setOutputStyle] = useState("actionable");
  const [agenda, setAgenda] = useState("");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    setSelectedIds(agents.slice(0, Math.min(3, agents.length)).map((agent) => agent.id));
    setRounds(2);
    setTopic("");
    setMeetingType("coordination");
    setOutputStyle("actionable");
    setAgenda("");
    initializedRef.current = true;
  }, [agents, open]);

  if (!open) return null;

  function toggleAgent(agentId) {
    setSelectedIds((current) => (current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId]));
  }

  async function handleSubmit() {
    if (selectedIds.length < 2 || !topic.trim()) return;
    await onSubmit(selectedIds, {
      topic: topic.trim(),
      rounds,
      meetingType,
      outputStyle,
      agenda: agenda.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-[130] bg-black/20 backdrop-blur-[2px]">
      <div className="flex min-h-full items-center justify-center px-4">
        <div className="w-full max-w-3xl rounded-xl border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
          <div className="border-b border-neutral-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-neutral-950">Reunion de grupo</div>
                <div className="mt-1 text-sm text-neutral-500">Lanza una conversacion de trabajo real entre agentes del perfil nuevo.</div>
              </div>
              <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cerrar
              </Button>
            </div>
          </div>
          <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Tema</label>
                <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ej: alineen una estrategia para mejorar memoria y observabilidad" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Tipo</label>
                  <select value={meetingType} onChange={(event) => setMeetingType(event.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none">
                    <option value="coordination">Coordinacion</option>
                    <option value="brainstorm">Brainstorm</option>
                    <option value="review">Revision tecnica</option>
                    <option value="handoff">Handoff operativo</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Enfoque</label>
                  <select value={outputStyle} onChange={(event) => setOutputStyle(event.target.value)} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none">
                    <option value="actionable">Accionable</option>
                    <option value="brief">Muy breve</option>
                    <option value="critical">Riesgos</option>
                    <option value="planning">Plan y siguientes pasos</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Participantes</label>
                  <span className="text-xs text-neutral-500">{selectedIds.length} seleccionados</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {agents.map((agent) => {
                    const selected = selectedIds.includes(agent.id);
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => toggleAgent(agent.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors",
                          selected ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-white",
                        )}
                      >
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md border text-base", selected ? "border-white/15 bg-white/10" : "border-neutral-200 bg-white")}>
                          <span>{agent.identityEmoji || ":brain:"}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{agent.identityName || agent.id}</div>
                          <div className={cn("mt-1 truncate text-xs", selected ? "text-white/65" : "text-neutral-500")}>{agent.model || "Modelo por defecto"}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Contexto extra</label>
                <textarea
                  value={agenda}
                  onChange={(event) => setAgenda(event.target.value)}
                  placeholder="Restricciones, puntos a cubrir o contexto compartido."
                  className="min-h-[108px] w-full rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition-[color,box-shadow,border-color] placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-[3px] focus-visible:ring-neutral-200"
                />
              </div>
            </div>
            <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Vueltas del equipo</label>
                <select value={rounds} onChange={(event) => setRounds(Number(event.target.value))} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none">
                  <option value={1}>1 vuelta</option>
                  <option value={2}>2 vueltas</option>
                  <option value={3}>3 vueltas</option>
                  <option value={4}>4 vueltas</option>
                  <option value={5}>5 vueltas</option>
                  <option value={6}>6 vueltas</option>
                </select>
                <div className="mt-2 text-xs text-neutral-500">Cada vuelta hace que todos hablen una vez y respondan a lo ya dicho.</div>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm leading-6 text-neutral-500">
                {meetingType === "brainstorm" ? "Explora opciones y hace que el equipo compare ideas." : meetingType === "review" ? "Empuja al equipo a revisar calidad, huecos y riesgos." : meetingType === "handoff" ? "Sirve para transferir contexto y cerrar siguientes pasos." : "Sirve para alinear decisiones y coordinar trabajo entre agentes."}
              </div>
              <Button className="w-full" onClick={() => void handleSubmit()} disabled={submitting || selectedIds.length < 2 || !topic.trim()}>
                {submitting ? "Iniciando..." : "Iniciar reunion"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
