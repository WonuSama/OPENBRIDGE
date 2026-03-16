"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import CategoryRounded from "@mui/icons-material/CategoryRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import NotesRounded from "@mui/icons-material/NotesRounded";
import RouteRounded from "@mui/icons-material/RouteRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import { useEffect, useMemo, useRef, useState } from "react";
import agentCatalog from "@/lib/awesome-openclaw-agents.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OpenRouterModelPicker } from "@/components/dashboard/openrouter-model-picker";

function prettifyCategory(value) {
  return String(value || "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function AdvancedSection({ open, setOpen, builder, setBuilder }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <TuneRounded sx={{ fontSize: 17 }} className="text-neutral-500" />
          <div>
            <div className="text-sm font-medium text-neutral-900">Avanzado</div>
            <div className="mt-0.5 text-xs text-neutral-500">Afinar identidad e instrucciones iniciales antes de crear.</div>
          </div>
        </div>
        <ExpandMoreRounded
          sx={{
            fontSize: 18,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
          }}
        />
      </button>

      {open ? (
        <div className="grid gap-4 border-t border-neutral-200 px-4 py-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-900">Emoji / identidad</label>
            <Input value={builder.emoji} onChange={(event) => setBuilder((current) => ({ ...current, emoji: event.target.value }))} placeholder=":brain:" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-900">Vibe</label>
            <Input value={builder.vibe} onChange={(event) => setBuilder((current) => ({ ...current, vibe: event.target.value }))} placeholder="Focused and useful" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-neutral-900">Instrucciones iniciales (`AGENTS.md`)</label>
            <textarea
              value={builder.instructions}
              onChange={(event) => setBuilder((current) => ({ ...current, instructions: event.target.value }))}
              placeholder="Ejemplo: Prioriza claridad, resume decisiones y pide confirmacion antes de cambios destructivos."
              className="min-h-[132px] w-full rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition-[color,box-shadow,border-color] placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-[3px] focus-visible:ring-neutral-200"
            />
            <div className="text-xs leading-5 text-neutral-500">Este bloque se guarda dentro del workspace del agente como `AGENTS.md`, para arrancar con contexto operativo real.</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AgentTemplatePicker({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const popoverRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (popoverRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    if (!open) return undefined;
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const selectedTemplate = useMemo(
    () => agentCatalog.agents.find((agent) => agent.id === value) || null,
    [value],
  );

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = !term
      ? agentCatalog.agents
      : agentCatalog.agents.filter((agent) =>
          [agent.title, agent.role, agent.id, agent.category].some((field) =>
            String(field || "")
              .toLowerCase()
              .includes(term),
          ),
        );

    return matches.reduce((accumulator, agent) => {
      const key = agent.category || "other";
      if (!accumulator[key]) accumulator[key] = [];
      accumulator[key].push(agent);
      return accumulator;
    }, {});
  }, [search]);

  const orderedGroups = Object.entries(filteredGroups).sort(([a], [b]) => a.localeCompare(b));
  const filteredCount = orderedGroups.reduce((total, [, agents]) => total + agents.length, 0);

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-left transition-colors hover:bg-white"
      >
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">Plantilla funcional</div>
          <div className="truncate text-sm font-medium text-neutral-900">{selectedTemplate ? selectedTemplate.title : "Elegir plantilla"}</div>
          <div className="mt-1 text-xs text-neutral-500">
            {selectedTemplate ? `${prettifyCategory(selectedTemplate.category)} · ${selectedTemplate.role}` : `${agentCatalog.total} agentes listos para usar`}
          </div>
        </div>
        <ExpandMoreRounded
          sx={{
            fontSize: 18,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
          }}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-full max-w-[min(100vw-2rem,720px)] rounded-xl border border-neutral-200 bg-white p-2.5 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-neutral-900">Biblioteca de agentes</div>
            <div className="text-xs text-neutral-500">{filteredCount || agentCatalog.total} plantillas</div>
          </div>

          <div className="relative mt-2.5">
            <SearchRounded sx={{ fontSize: 16 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, rol, id tecnico o categoria..." className="pl-9" />
          </div>

          <div className="mt-2.5 max-h-[340px] overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50">
            {orderedGroups.length ? (
              orderedGroups.map(([category, agents]) => (
                <div key={category} className="border-b border-neutral-100 last:border-b-0">
                  <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-neutral-100 bg-white/95 px-3 py-2 backdrop-blur-sm">
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">{prettifyCategory(category)}</div>
                    <div className="text-[11px] text-neutral-400">{agents.length}</div>
                  </div>
                  <div className="p-2">
                    {agents.map((agent) => {
                      const active = agent.id === value;
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => {
                            onSelect(agent);
                            setOpen(false);
                          }}
                          className={`mb-2 flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors last:mb-0 ${
                            active ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200 bg-white hover:bg-neutral-50"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-sm font-medium ${active ? "text-white" : "text-neutral-900"}`}>{agent.title}</div>
                            <div className={`mt-1 line-clamp-2 text-xs ${active ? "text-white/70" : "text-neutral-500"}`}>{agent.role}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className={`text-xs font-medium ${active ? "text-white/80" : "text-neutral-600"}`}>{agent.id}</div>
                            <div className={`mt-1 text-[11px] ${active ? "text-white/60" : "text-neutral-400"}`}>{prettifyCategory(agent.category)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-neutral-500">No encontre plantillas con ese filtro.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MultiagentsCreateModal({ open, onClose, builder, setBuilder, defaultModel, creating, createAgent, pickPreset }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const selectedTemplate = agentCatalog.agents.find((agent) => agent.id === builder.templateId) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/18 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className="grid w-full max-w-[1120px] gap-0 overflow-visible rounded-2xl border border-neutral-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.14)] xl:grid-cols-[minmax(0,1.15fr)_340px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="min-w-0 rounded-l-2xl">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">New agent</div>
              <div className="mt-1 text-lg font-semibold tracking-tight text-neutral-950">Configurar agente</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50"
              aria-label="Cerrar"
            >
              <CloseRounded sx={{ fontSize: 18 }} />
            </button>
          </div>

          <div className="space-y-5 px-6 py-6">
            <AgentTemplatePicker value={builder.templateId} onSelect={pickPreset} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-900">Id tecnico</label>
                <Input value={builder.id} onChange={(event) => setBuilder((current) => ({ ...current, id: event.target.value }))} placeholder="research" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-900">Nombre visible</label>
                <Input value={builder.name} onChange={(event) => setBuilder((current) => ({ ...current, name: event.target.value }))} placeholder="Research" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-neutral-900">Funcion principal</label>
                <Input value={builder.role} onChange={(event) => setBuilder((current) => ({ ...current, role: event.target.value }))} placeholder="Investigacion y sintesis" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-neutral-900">Modelo</label>
                <OpenRouterModelPicker value={builder.model} onChange={(nextModel) => setBuilder((current) => ({ ...current, model: nextModel }))} defaultModel={defaultModel} buttonLabel="Modelo" />
              </div>
            </div>

            <AdvancedSection open={advancedOpen} setOpen={setAdvancedOpen} builder={builder} setBuilder={setBuilder} />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={createAgent} disabled={!builder.id || creating}>
                <AddRounded sx={{ fontSize: 16 }} />
                {creating ? "Creando..." : "Crear agente"}
              </Button>
            </div>
          </div>
        </div>

        <aside className="rounded-r-2xl border-l border-neutral-200 bg-neutral-50 px-5 py-6">
          <div className="text-sm font-medium text-neutral-900">Que se prepara</div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4">
              <div className="flex items-start gap-3">
                <AutoAwesomeRounded sx={{ fontSize: 18 }} className="mt-0.5 text-neutral-500" />
                <div>
                  <div className="text-sm font-medium text-neutral-900">Plantilla seleccionada</div>
                  <div className="mt-1 text-sm leading-6 text-neutral-500">
                    {selectedTemplate ? `${selectedTemplate.title} · ${selectedTemplate.role}` : "Elegi una de las plantillas de awesome-openclaw-agents para arrancar con una base funcional real."}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4">
              <div className="flex items-start gap-3">
                <CategoryRounded sx={{ fontSize: 18 }} className="mt-0.5 text-neutral-500" />
                <div>
                  <div className="text-sm font-medium text-neutral-900">Cobertura amplia</div>
                  <div className="mt-1 text-sm leading-6 text-neutral-500">{agentCatalog.total} tipos de agente listos para precargar, agrupados por categoria y editables antes de crear.</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4">
              <div className="flex items-start gap-3">
                <Inventory2Rounded sx={{ fontSize: 18 }} className="mt-0.5 text-neutral-500" />
                <div>
                  <div className="text-sm font-medium text-neutral-900">Workspace aislado</div>
                  <div className="mt-1 text-sm leading-6 text-neutral-500">Se crea en `.openclaw-nuevo/workspace-{builder.id || "agent"}` para mantener independencia total.</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4">
              <div className="flex items-start gap-3">
                <SmartToyRounded sx={{ fontSize: 18 }} className="mt-0.5 text-neutral-500" />
                <div>
                  <div className="text-sm font-medium text-neutral-900">Identidad inicial</div>
                  <div className="mt-1 text-sm leading-6 text-neutral-500">Se deja listo con `IDENTITY.md` usando nombre, funcion, vibe y emoji.</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4">
              <div className="flex items-start gap-3">
                <NotesRounded sx={{ fontSize: 18 }} className="mt-0.5 text-neutral-500" />
                <div>
                  <div className="text-sm font-medium text-neutral-900">Contexto operativo</div>
                  <div className="mt-1 text-sm leading-6 text-neutral-500">Si usas el bloque avanzado, tambien se crea un `AGENTS.md` inicial dentro del workspace.</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4">
              <div className="flex items-start gap-3">
                <RouteRounded sx={{ fontSize: 18 }} className="mt-0.5 text-neutral-500" />
                <div>
                  <div className="text-sm font-medium text-neutral-900">Modelo precargado</div>
                  <div className="mt-1 text-sm leading-6 text-neutral-500">Se toma desde el perfil actual: {defaultModel}.</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
