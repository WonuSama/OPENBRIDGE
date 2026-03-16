import NotificationsRounded from "@mui/icons-material/NotificationsRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import LaunchRounded from "@mui/icons-material/LaunchRounded";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const RELEASE_SEEN_KEY = "openclaw-release-seen";

function fmtRelative(dateString) {
  if (!dateString) return "Ahora";
  const value = new Date(dateString).getTime();
  const diffMs = Date.now() - value;
  const diffHours = Math.max(1, Math.round(diffMs / 3600000));
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} d`;
}

export function DashboardTopbar({ query, setQuery, userProfile, userPopoverOpen, setUserPopoverOpen, refreshAll, scope, tree, refreshing, draftProfile, setDraftProfile, saveUserProfile, sidebarCollapsed }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [updatingOpenClaw, setUpdatingOpenClaw] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [seenVersion, setSeenVersion] = useState("");
  const notificationsRef = useRef(null);
  const userPopoverRef = useRef(null);

  useEffect(() => {
    try {
      setSeenVersion(window.localStorage.getItem(RELEASE_SEEN_KEY) || "");
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications/openclaw", { cache: "no-store" });
        const data = await response.json();
        if (!active || !response.ok) return;
        setNotifications(data.items || []);
      } catch {}
    }

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 12 * 60 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    let active = true;
    setNotificationsLoading(true);
    setNotificationsError("");

    fetch("/api/notifications/openclaw", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) throw new Error(data.error || "No pude cargar notificaciones");
        const items = data.items || [];
        setNotifications(items);
        const latestVersion = items[0]?.version || "";
        if (latestVersion) {
          try {
            window.localStorage.setItem(RELEASE_SEEN_KEY, latestVersion);
            setSeenVersion(latestVersion);
          } catch {}
        }
      })
      .catch((error) => {
        if (!active) return;
        setNotificationsError(error.message);
      })
      .finally(() => {
        if (active) setNotificationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [notificationsOpen]);

  useEffect(() => {
    function onPointerDown(event) {
      if (notificationsRef.current?.contains(event.target)) return;
      setNotificationsOpen(false);
    }

    if (!notificationsOpen) return undefined;
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [notificationsOpen, setNotificationsOpen]);

  useEffect(() => {
    function onPointerDown(event) {
      if (userPopoverRef.current?.contains(event.target)) return;
      setUserPopoverOpen(false);
    }

    if (!userPopoverOpen) return undefined;
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [userPopoverOpen, setUserPopoverOpen]);

  const hasUnread = useMemo(() => {
    const latestVersion = notifications[0]?.version;
    if (!latestVersion) return false;
    return latestVersion !== seenVersion;
  }, [notifications, seenVersion]);

  async function handleOpenClawUpdate() {
    try {
      setUpdatingOpenClaw(true);
      setUpdateMessage("");
      const response = await fetch("/api/system/update", {
        method: "POST",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No pude actualizar OpenClaw");
      }
      setUpdateMessage("OpenClaw actualizado. El perfil nuevo ya fue reiniciado y verificado.");
    } catch (error) {
      setUpdateMessage(error.message);
    } finally {
      setUpdatingOpenClaw(false);
    }
  }

  return (
    <header
      className="sticky top-0 z-30 -mx-2 border-b border-neutral-200 bg-[#f6f7f8]/92 px-2 pb-5 backdrop-blur-sm lg:fixed lg:top-0 lg:right-0 lg:z-40 lg:mx-0 lg:border-b lg:px-6 lg:pt-6 lg:pb-4"
      style={{
        left: sidebarCollapsed ? "92px" : "300px",
      }}
    >
      <div className="relative flex flex-col gap-3 pt-0 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative w-full max-w-xl">
          <SearchRounded className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" sx={{ fontSize: 18 }} />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar archivos, carpetas o rutas" className="pl-9" aria-label="Buscar archivos y carpetas" />
        </div>
      </div>

      <div className="relative flex items-center gap-2">
        <div ref={notificationsRef} className="relative">
          <Button variant="outline" size="icon" aria-label="Notificaciones" onClick={() => setNotificationsOpen((value) => !value)}>
            <NotificationsRounded sx={{ fontSize: 18 }} />
          </Button>
          {hasUnread ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" /> : null}
          {notificationsOpen ? (
            <div className="absolute right-[8.5rem] top-12 z-40 w-[420px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                <div>
                  <div className="text-sm font-medium text-neutral-900">Notificaciones</div>
                  <div className="text-xs text-neutral-500">Updates oficiales en formato corto, como changelog de producto.</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => void handleOpenClawUpdate()} disabled={updatingOpenClaw}>
                  {updatingOpenClaw ? "Actualizando..." : "Actualizar OpenClaw"}
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {updateMessage ? <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">{updateMessage}</div> : null}
                {notificationsLoading ? <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-500">Cargando release más reciente...</div> : null}
                {!notificationsLoading && notificationsError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">{notificationsError}</div> : null}
                {!notificationsLoading && !notificationsError && !notifications.length ? <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-500">No hay actualizaciones para mostrar.</div> : null}
                {notifications.map((item) => (
                  <div key={item.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">{fmtRelative(item.publishedAt)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleOpenClawUpdate()}
                          disabled={updatingOpenClaw}
                          className="inline-flex rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingOpenClaw ? "Actualizando..." : "Actualizar"}
                        </button>
                        <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-100">
                          <LaunchRounded sx={{ fontSize: 16 }} />
                        </a>
                      </div>
                    </div>
                    <div className="mt-3 whitespace-pre-line rounded-xl border border-neutral-200 bg-white px-4 py-4 text-[14px] leading-6 text-neutral-800">{item.summary || item.headline}</div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
                      <a href={item.sources?.github} target="_blank" rel="noreferrer" className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 hover:bg-neutral-100">GitHub</a>
                      <a href={item.sources?.x} target="_blank" rel="noreferrer" className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 hover:bg-neutral-100">X / Twitter</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <button
          onClick={() => setUserPopoverOpen((value) => !value)}
          className="flex h-10 min-w-10 items-center justify-center rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          aria-label="Abrir perfil de usuario"
        >
          <span className="hidden pr-2 text-sm text-neutral-500 sm:inline">{userProfile.name}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">{userProfile.initials}</span>
        </button>
        <Button variant="outline" size="icon" aria-label="Actualizar datos" onClick={() => refreshAll(scope, tree.currentPath)}>
          <SyncRounded sx={{ fontSize: 17 }} className={cn(refreshing && "animate-spin")} />
        </Button>

        {userPopoverOpen ? (
          <div ref={userPopoverRef} className="contents">
          <div className="absolute right-0 top-12 z-40 w-[320px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">{draftProfile.name.trim().slice(0, 2).toUpperCase() || "U"}</div>
              <div>
                <div className="text-sm font-medium text-neutral-900">{draftProfile.name || "Usuario"}</div>
                <div className="text-sm text-neutral-500">{draftProfile.role || "Operador"}</div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="space-y-2"><label className="block text-sm font-medium text-neutral-900">Nombre</label><Input value={draftProfile.name} onChange={(event) => setDraftProfile((current) => ({ ...current, name: event.target.value }))} /></div>
              <div className="space-y-2"><label className="block text-sm font-medium text-neutral-900">Rol</label><Input value={draftProfile.role} onChange={(event) => setDraftProfile((current) => ({ ...current, role: event.target.value }))} /></div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setUserPopoverOpen(false)}>Cerrar</Button>
              <Button onClick={saveUserProfile}><PersonRounded sx={{ fontSize: 16 }} />Guardar</Button>
            </div>
          </div>
          </div>
        ) : null}
      </div>
      </div>
    </header>
  );
}
