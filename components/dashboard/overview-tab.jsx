import AddRounded from "@mui/icons-material/AddRounded";
import CalendarTodayRounded from "@mui/icons-material/CalendarTodayRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import MemoryRounded from "@mui/icons-material/MemoryRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import UploadRounded from "@mui/icons-material/UploadRounded";
import DeveloperBoardRounded from "@mui/icons-material/DeveloperBoardRounded";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/shared";
import { AgentChatPanel } from "@/components/dashboard/agent-chat-panel";
import { cn } from "@/lib/utils";
import { dateLabel, fmtDate, fmtPercent, fmtRate, greetingForHour, parentLabel } from "@/components/dashboard/utils";

function MetricPill({ icon: Icon, value, label, live = false }) {
  return (
    <div className="flex items-center gap-2 pr-4 text-sm">
      <Icon sx={{ fontSize: 17 }} className="text-neutral-500" />
      <strong>{value}</strong>
      <span className="text-neutral-500">{label}</span>
      {live ? <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" /> : null}
    </div>
  );
}

const CALENDAR_DAYS = [
  { key: "lu", label: "Lu", date: 9 },
  { key: "ma", label: "Ma", date: 10 },
  { key: "mi", label: "Mi", date: 11 },
  {
    key: "ju",
    label: "Ju",
    date: 12,
    active: true,
    events: [
      { time: "10:00", title: "Revisión del workspace", tone: "white" },
      { time: "17:30", title: "Check del agente", tone: "blue" },
    ],
  },
  { key: "vi", label: "Vi", date: 13 },
  { key: "sa", label: "Sa", date: 14 },
  { key: "do", label: "Do", date: 15 },
];

export function DashboardOverviewTab(props) {
  const {
    userProfile,
    scope,
    loadingTree,
    filteredItems,
    setActiveTab,
    loadTree,
    openFile,
    notes,
    noteDraft,
    setNoteDraft,
    addNote,
    toggleNote,
    setEditorOpen,
    systemStats,
  } = props;

  return (
    <section>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-sm text-neutral-500">{dateLabel()}</div>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">{greetingForHour()}, {userProfile.name}.</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setActiveTab("workspace")}>Ver workspace</Button>
          <Button onClick={() => setEditorOpen(true)}>Abrir editor</Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 rounded-full border border-neutral-200 bg-white px-4 py-3">
        <MetricPill icon={DeveloperBoardRounded} value={fmtPercent(systemStats?.cpu?.usagePercent)} label="cpu" live />
        <div className="hidden h-6 w-px bg-neutral-200 sm:block" />
        <MetricPill icon={MemoryRounded} value={fmtPercent(systemStats?.mem?.percent)} label="ram" live />
        <div className="hidden h-6 w-px bg-neutral-200 sm:block" />
        <MetricPill icon={DownloadRounded} value={fmtRate(systemStats?.network?.rxBps || 0)} label="bajada" live />
        <div className="hidden h-6 w-px bg-neutral-200 sm:block" />
        <MetricPill icon={UploadRounded} value={fmtRate(systemStats?.network?.txBps || 0)} label="subida" live />
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px] xl:items-stretch">
        <Card className="h-full self-stretch">
          <CardHeader className="border-b border-neutral-200 px-5 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-[1.05rem]">Vista inicial</CardTitle>
                <CardDescription>Acceso rápido al contenido más útil del workspace activo.</CardDescription>
              </div>
              <Badge variant="neutral">{scope === "workspace" ? "workspace" : "state"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-4">
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1.2fr)_96px_150px_86px] gap-3 px-3 text-xs font-medium uppercase tracking-[0.08em] text-neutral-400">
                <div>Nombre</div>
                <div>Tipo</div>
                <div>Modificado</div>
                <div className="text-right">Acción</div>
              </div>
              {loadingTree ? <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-8 text-sm text-neutral-500">Cargando elementos remotos...</div> : null}
              {!loadingTree && !filteredItems.length ? <EmptyState title="No hay resultados" detail="Amplia la búsqueda o cambia de fuente para ver otra ubicación remota." /> : null}
              {!loadingTree && filteredItems.slice(0, 5).map((item) => (
                <div key={item.path} className="grid grid-cols-[minmax(0,1.2fr)_96px_150px_86px] items-center gap-3 rounded-lg border border-neutral-200/70 bg-neutral-50/70 px-3 py-3 transition-colors hover:bg-white">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-neutral-900">{item.name}</div>
                    <div className="truncate text-xs text-neutral-500">{parentLabel(item.path)}</div>
                  </div>
                  <div className="text-sm text-neutral-600">{item.type === "directory" ? "Carpeta" : "Archivo"}</div>
                  <div className="text-sm text-neutral-600">{fmtDate(item.mtimeEpoch)}</div>
                  <div className="text-right">
                    {item.type === "directory" ? (
                      <Button variant="ghost" size="sm" onClick={() => { setActiveTab("workspace"); loadTree(item.path, scope); }}>Abrir</Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => openFile(item.path)}>Editar</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <AgentChatPanel className="h-full self-stretch" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px] xl:items-start">
        <Card className="self-start xl:col-span-1">
          <CardHeader className="border-b border-neutral-200 px-5 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-[1.05rem]">Calendario</CardTitle>
                <CardDescription>Vista previa visual para organizar agenda y seguimiento del workspace.</CardDescription>
              </div>
              <CalendarTodayRounded sx={{ fontSize: 18 }} className="text-neutral-400" />
            </div>
          </CardHeader>
          <CardContent className="px-5">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-neutral-900">Google Calendar</div>
                  <div className="mt-1 text-xs text-neutral-500">Conecta una cuenta para ver reuniones, revisiones y bloques de trabajo desde aquí.</div>
                </div>
                <Button variant="outline" size="sm">
                  <LinkRounded sx={{ fontSize: 16 }} />
                  Conectar
                </Button>
              </div>

              <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-neutral-900">Semana actual</div>
                    <div className="text-xs text-neutral-500">Diseño visual listo para integrar más adelante</div>
                  </div>
                  <div className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">Preview</div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.08em] text-neutral-400">
                  {CALENDAR_DAYS.map((day) => (
                    <div key={day.key}>{day.label}</div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-2">
                  {CALENDAR_DAYS.map((day) => (
                    <div
                      key={day.key}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 text-left",
                        day.active ? "border-blue-200 bg-blue-50" : "border-neutral-200 bg-white"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-[11px] font-medium uppercase tracking-[0.08em]", day.active ? "text-blue-700" : "text-neutral-400")}>{day.label}</span>
                        <span className={cn("text-sm font-medium", day.active ? "text-blue-700" : "text-neutral-800")}>{day.date}</span>
                      </div>

                      {day.events?.length ? (
                        <div className="mt-2 space-y-1.5">
                          {day.events.map((event) => (
                            <div
                              key={`${day.key}-${event.time}`}
                              className={cn(
                                "rounded-md px-2 py-1.5 text-[11px] leading-4 ring-1",
                                event.tone === "blue"
                                  ? "bg-[#eef4ff] text-neutral-700 ring-blue-100"
                                  : "bg-white text-neutral-700 ring-blue-100"
                              )}
                            >
                              <div className="font-medium">{event.time}</div>
                              <div className="truncate">{event.title}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 h-10 rounded-md border border-dashed border-neutral-200 bg-neutral-50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start xl:col-start-2">
          <CardHeader className="border-b border-neutral-200 px-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[1.05rem]">Notas</CardTitle>
                <CardDescription>Recordatorios personales guardados localmente en este navegador.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addNote}><AddRounded sx={{ fontSize: 16 }} />Guardar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            <div className="flex gap-2"><Input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Escribe un recordatorio" aria-label="Escribir recordatorio" /></div>
            <div className="space-y-2">
              {notes.length ? notes.map((note) => (
                <button key={note.id} onClick={() => toggleNote(note.id)} className="flex w-full items-start gap-3 rounded-md border border-neutral-200 px-3 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400">
                  <span className={cn("mt-1 h-4 w-4 rounded-full border", note.done ? "border-fuchsia-300 bg-fuchsia-300" : "border-neutral-300 bg-white")} />
                  <span className="min-w-0"><span className={cn("block text-sm font-medium", note.done ? "text-neutral-400 line-through" : "text-neutral-900")}>{note.title}</span><span className="mt-1 block text-xs text-neutral-500">{note.detail}</span></span>
                </button>
              )) : <EmptyState title="Sin notas guardadas" detail="Usa este panel para dejar recordatorios rápidos del workspace." />}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </section>
  );
}
