import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import ExtensionRounded from "@mui/icons-material/ExtensionRounded";
import GitHub from "@mui/icons-material/GitHub";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/components/dashboard/utils";

function SkillDetailsModal({ item, open, onClose }) {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/20 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex min-h-full items-center justify-center px-4">
        <div className="w-full max-w-2xl rounded-xl border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]" onMouseDown={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <div className="text-base font-semibold text-neutral-950">{item.title || item.slug}</div>
              <div className="mt-1 text-xs text-neutral-500">{item.slug}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50"
              aria-label="Cerrar detalles"
            >
              <CloseRounded sx={{ fontSize: 18 }} />
            </button>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1">{item.source === "recommended" ? "Local" : item.source === "clawhub" ? "ClawHub" : "GitHub"}</span>
              {"score" in item ? <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1">score {item.score.toFixed(3)}</span> : null}
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm leading-7 text-neutral-700">
              {item.description || "No hay descripción disponible para este skill."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillPicker({ source, query, setQuery, items, selectedSkill, setSelectedSkill, loading, searching, onSearch, searchWarning }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-900">Skill</label>
      <div ref={popoverRef} className="relative max-w-full">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-left transition-colors hover:bg-white"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-neutral-900">{selectedSkill?.title || selectedSkill?.slug || "Seleccionar skill"}</div>
            <div className="mt-1 text-xs text-neutral-500">{source === "recommended" ? "Catálogo local recomendado" : "Catálogo remoto de ClawHub"}</div>
          </div>
          <ExpandMoreRounded sx={{ fontSize: 18, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }} />
        </button>

        {open ? (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-full max-w-[min(100%,680px)] rounded-xl border border-neutral-200 bg-white p-2.5 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-neutral-900">Seleccionar skill</div>
              <Button type="button" variant="outline" size="sm" onClick={onSearch}>
                <SyncRounded sx={{ fontSize: 15 }} />
                {searching ? "Buscando..." : "Actualizar"}
              </Button>
            </div>

            <div className="mt-2.5 relative">
              <SearchRounded sx={{ fontSize: 16 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={source === "recommended" ? "Buscar skills locales..." : "Buscar skills en ClawHub..."} className="pl-9" />
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-neutral-500">
              <span>{loading ? "Cargando catálogo..." : `${items.length} skills disponibles`}</span>
            </div>

            {searchWarning ? <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{searchWarning}</div> : null}

            <div className="mt-2.5 max-h-[320px] overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50">
              {items.length ? (
                <div className="p-2">
                  {items.map((item) => {
                    const active = selectedSkill?.slug === item.slug && selectedSkill?.source === item.source;
                    return (
                      <button
                        key={`${item.source}:${item.slug}`}
                        type="button"
                        onClick={() => {
                          setSelectedSkill(item);
                          setOpen(false);
                        }}
                        className={`mb-2 flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors last:mb-0 ${
                          active ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200 bg-white hover:bg-neutral-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className={`truncate text-sm font-medium ${active ? "text-white" : "text-neutral-900"}`}>{item.title || item.slug}</div>
                          <div className={`mt-1 truncate text-xs ${active ? "text-white/70" : "text-neutral-500"}`}>{item.slug}</div>
                        </div>
                        <div className={`shrink-0 text-[11px] font-medium ${active ? "text-white/70" : "text-neutral-500"}`}>
                          {item.source === "recommended" ? "Local" : "ClawHub"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-sm text-neutral-500">No encontré skills con ese filtro.</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SkillsTab() {
  const [agents, setAgents] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [results, setResults] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [query, setQuery] = useState("agent");
  const [source, setSource] = useState("recommended");
  const [githubUrl, setGithubUrl] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [installingKey, setInstallingKey] = useState("");
  const [error, setError] = useState("");
  const [searchWarning, setSearchWarning] = useState("");

  const agentOptions = useMemo(() => agents.map((agent) => ({ ...agent, selected: selectedAgentIds.includes(agent.id) })), [agents, selectedAgentIds]);

  const groupedInstalled = useMemo(() => {
    const map = new Map();
    for (const item of installed) {
      if (!map.has(item.slug)) {
        map.set(item.slug, { slug: item.slug, agents: [] });
      }
      map.get(item.slug).agents.push(item.agentId);
    }
    return Array.from(map.values()).sort((a, b) => a.slug.localeCompare(b.slug));
  }, [installed]);

  const activeList = source === "recommended" ? recommended : results;

  async function loadData(nextQuery = "") {
    try {
      setError("");
      const data = await api(`/api/skills${nextQuery ? `?query=${encodeURIComponent(nextQuery)}` : ""}`);
      const nextAgents = data.agents || [];
      const nextInstalled = data.installed || [];
      const nextResults = data.results || [];
      const nextRecommended = data.recommended || [];
      setAgents(nextAgents);
      setInstalled(nextInstalled);
      setResults(nextResults);
      setRecommended(nextRecommended);
      setSearchWarning(data.searchError || "");
      setSelectedAgentIds((current) => {
        if (current.length) return current.filter((id) => nextAgents.some((agent) => agent.id === id));
        return nextAgents.length ? [nextAgents[0].id] : [];
      });
      setSelectedSkill((current) => {
        const pool = source === "recommended" ? nextRecommended : nextResults;
        if (current) {
          const stillExists = pool.find((item) => item.slug === current.slug && item.source === current.source);
          if (stillExists) return stillExists;
        }
        return pool[0] || null;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  useEffect(() => {
    loadData(query);
  }, []);

  useEffect(() => {
    const pool = source === "recommended" ? recommended : results;
    setSelectedSkill(pool[0] || null);
  }, [source]);

  function toggleAgent(agentId) {
    setSelectedAgentIds((current) => (current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId]));
  }

  async function handleSearch() {
    setSearching(true);
    await loadData(query);
  }

  async function handleInstallSelected() {
    if (!selectedSkill) return;
    try {
      setInstallingKey(`${selectedSkill.source}:${selectedSkill.slug}`);
      setError("");
      await api("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: selectedSkill.source, slug: selectedSkill.slug, agentIds: selectedAgentIds }),
      });
      await loadData(query);
    } catch (err) {
      setError(err.message);
    } finally {
      setInstallingKey("");
    }
  }

  async function handleInstallGithub() {
    try {
      setInstallingKey("github");
      setError("");
      await api("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "github", githubUrl, agentIds: selectedAgentIds }),
      });
      await loadData(query);
      setGithubUrl("");
    } catch (err) {
      setError(err.message);
    } finally {
      setInstallingKey("");
    }
  }

  return (
    <>
      <SkillDetailsModal item={selectedSkill} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
      <section className="space-y-5">
        <Card className="rounded-lg">
          <CardHeader className="border-b border-neutral-200 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                  <ExtensionRounded sx={{ fontSize: 15 }} />
                  Skills
                </div>
                <CardTitle className="mt-1 text-lg tracking-tight text-neutral-950">Instalar y derivar skills</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant={source === "recommended" ? "default" : "outline"} size="sm" onClick={() => setSource("recommended")}>
                  <Inventory2Rounded sx={{ fontSize: 16 }} />
                  Recomendadas
                </Button>
                <Button type="button" variant={source === "clawhub" ? "default" : "outline"} size="sm" onClick={() => setSource("clawhub")}>
                  <AutoAwesomeRounded sx={{ fontSize: 16 }} />
                  ClawHub
                </Button>
                <Button type="button" variant={source === "github" ? "default" : "outline"} size="sm" onClick={() => setSource("github")}>
                  <GitHub sx={{ fontSize: 16 }} />
                  GitHub
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5 py-5">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">Asignar a agentes</div>
              <div className="flex flex-wrap gap-2">
                {agentOptions.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => toggleAgent(agent.id)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      agent.selected ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            </div>

            {source === "github" ? (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <Input value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/usuario/repo-del-skill" />
                  </div>
                  <Button type="button" onClick={handleInstallGithub} disabled={installingKey === "github" || !githubUrl.trim() || !selectedAgentIds.length}>
                    <GitHub sx={{ fontSize: 16 }} />
                    {installingKey === "github" ? "Instalando..." : "Instalar desde GitHub"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <SkillPicker
                  source={source}
                  query={query}
                  setQuery={setQuery}
                  items={activeList}
                  selectedSkill={selectedSkill}
                  setSelectedSkill={setSelectedSkill}
                  loading={loading}
                  searching={searching}
                  onSearch={handleSearch}
                  searchWarning={searchWarning}
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-neutral-900">{selectedSkill?.title || selectedSkill?.slug || "Sin skill seleccionada"}</div>
                    <div className="mt-1 text-xs text-neutral-500">{selectedSkill ? (selectedSkill.source === "recommended" ? "Local" : "ClawHub") : "Elegí una skill para instalarla"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => setDetailsOpen(true)} disabled={!selectedSkill}>
                      <InfoOutlined sx={{ fontSize: 16 }} />
                      Detalles
                    </Button>
                    <Button type="button" onClick={handleInstallSelected} disabled={!selectedSkill || !selectedAgentIds.length || installingKey === `${selectedSkill?.source}:${selectedSkill?.slug}`}>
                      <DownloadRounded sx={{ fontSize: 16 }} />
                      {installingKey === `${selectedSkill?.source}:${selectedSkill?.slug}` ? "Instalando..." : "Instalar skill"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="border-b border-neutral-200 px-5 py-4">
            <CardTitle className="text-base tracking-tight text-neutral-950">Skills instalados</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            {groupedInstalled.length ? (
              <div className="space-y-3">
                {groupedInstalled.map((skill) => (
                  <div key={skill.slug} className="rounded-lg border border-neutral-200 bg-white px-4 py-4">
                    <div className="text-sm font-medium text-neutral-900">{skill.slug}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skill.agents.map((agentId) => (
                        <span key={`${skill.slug}-${agentId}`} className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600">
                          {agentId}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-500">
                Todavia no hay skills instalados en los workspaces de `.openclaw-nuevo`.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
