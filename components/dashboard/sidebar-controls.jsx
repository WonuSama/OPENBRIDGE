"use client";

import EditRounded from "@mui/icons-material/EditRounded";
import LaunchRounded from "@mui/icons-material/LaunchRounded";
import NotificationsRounded from "@mui/icons-material/NotificationsRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
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

function MenuItem({ icon: Icon, label, onClick, disabled = false, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left text-sm text-neutral-800 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex items-center gap-2.5">
        <Icon sx={{ fontSize: 16 }} className="text-neutral-500" />
        <span>{label}</span>
      </span>
      {trailing}
    </button>
  );
}

function NotificationsPopover({ notificationsRef, notificationsOpen, notificationsLoading, notificationsError, notifications, updateMessage, updatingOpenClaw, handleOpenClawUpdate, align = "right" }) {
  if (!notificationsOpen) return null;

  return (
    <div
      ref={notificationsRef}
      className={cn(
        "absolute z-40 w-[380px] max-w-[calc(100vw-7rem)] rounded-[18px] border border-neutral-200 bg-white p-4 text-neutral-900 shadow-[0_18px_60px_rgba(0,0,0,0.12)]",
        align === "side" ? "left-[calc(100%+0.75rem)] bottom-0" : "right-0 bottom-[calc(100%+0.75rem)]",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        <div>
          <div className="text-sm font-medium text-neutral-900">Notificaciones</div>
          <div className="text-xs text-neutral-500">Actualizaciones cortas de producto y notas de versión.</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleOpenClawUpdate()} disabled={updatingOpenClaw}>
          {updatingOpenClaw ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>
      <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {updateMessage ? <div className="rounded-[12px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">{updateMessage}</div> : null}
        {notificationsLoading ? <div className="rounded-[12px] border border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-500">Cargando notificaciones...</div> : null}
        {!notificationsLoading && notificationsError ? <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">{notificationsError}</div> : null}
        {!notificationsLoading && !notificationsError && !notifications.length ? <div className="rounded-[12px] border border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-500">No hay actualizaciones para mostrar.</div> : null}
        {notifications.map((item) => (
          <div key={item.id} className="rounded-[12px] border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">{fmtRelative(item.publishedAt)}</div>
              <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-100">
                <LaunchRounded sx={{ fontSize: 16 }} />
              </a>
            </div>
            <div className="mt-3 whitespace-pre-line rounded-[10px] border border-neutral-200 bg-white px-4 py-4 text-[14px] leading-6 text-neutral-800">{item.summary || item.headline}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSidebarControls({
  collapsed,
  userProfile,
  draftProfile,
  setDraftProfile,
  saveUserProfile,
  refreshing,
  onRefresh,
  onOpenSettings,
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [updatingOpenClaw, setUpdatingOpenClaw] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [seenVersion, setSeenVersion] = useState("");
  const rootRef = useRef(null);
  const notificationsRef = useRef(null);

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
        if (!ok) throw new Error(data.error || "No pude cargar notificaciones.");
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
      if (rootRef.current?.contains(event.target)) return;
      setMenuOpen(false);
      setNotificationsOpen(false);
      setEditingProfile(false);
    }
    if (!menuOpen && !notificationsOpen) return undefined;
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen, notificationsOpen]);

  const hasUnread = useMemo(() => {
    const latestVersion = notifications[0]?.version;
    if (!latestVersion) return false;
    return latestVersion !== seenVersion;
  }, [notifications, seenVersion]);

  async function handleOpenClawUpdate() {
    try {
      setUpdatingOpenClaw(true);
      setUpdateMessage("");
      const response = await fetch("/api/system/update", { method: "POST", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No pude actualizar OpenClaw.");
      setUpdateMessage("OpenClaw se actualizó y reinició correctamente.");
    } catch (error) {
      setUpdateMessage(error.message);
    } finally {
      setUpdatingOpenClaw(false);
    }
  }

  function handleSaveProfile() {
    saveUserProfile();
    setEditingProfile(false);
    setMenuOpen(false);
  }

  if (collapsed) {
    return (
      <div ref={rootRef} className="relative flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setMenuOpen((value) => !value);
            setNotificationsOpen(false);
            setEditingProfile(false);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/8 bg-white/5 text-white/84 transition-colors hover:bg-white/8"
          aria-label="Abrir menú de usuario"
        >
          <PersonOutlineRounded sx={{ fontSize: 18 }} />
        </button>
        <button
          type="button"
          onClick={() => {
            setNotificationsOpen((value) => !value);
            setMenuOpen(false);
            setEditingProfile(false);
          }}
          className="relative flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/8 bg-white/5 text-white/84 transition-colors hover:bg-white/8"
          aria-label="Abrir notificaciones"
        >
          <NotificationsRounded sx={{ fontSize: 18 }} />
          {hasUnread ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" /> : null}
        </button>

        <NotificationsPopover
          notificationsRef={notificationsRef}
          notificationsOpen={notificationsOpen}
          notificationsLoading={notificationsLoading}
          notificationsError={notificationsError}
          notifications={notifications}
          updateMessage={updateMessage}
          updatingOpenClaw={updatingOpenClaw}
          handleOpenClawUpdate={handleOpenClawUpdate}
          align="side"
        />

        {menuOpen ? (
          <div className="absolute left-[calc(100%+0.75rem)] bottom-0 z-40 w-[320px] max-w-[calc(100vw-7rem)] rounded-[18px] border border-neutral-200 bg-white p-3 text-neutral-900 shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
            <div className="px-2 pb-2 text-sm font-medium text-neutral-900">Usuario</div>
            <div className="space-y-1">
              <MenuItem icon={SyncRounded} label={updatingOpenClaw ? "Actualizando..." : "Update"} onClick={() => void handleOpenClawUpdate()} disabled={updatingOpenClaw} trailing={refreshing ? <SyncRounded sx={{ fontSize: 15 }} className="animate-spin text-neutral-400" /> : null} />
              <MenuItem icon={EditRounded} label="Editar perfil" onClick={() => setEditingProfile((value) => !value)} />
              <MenuItem icon={SettingsRounded} label="Configuración" onClick={() => { setMenuOpen(false); onOpenSettings?.(); }} />
            </div>
            {editingProfile ? (
              <div className="mt-3 rounded-[14px] border border-neutral-200 bg-neutral-50 p-3">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">Nombre</label>
                    <Input value={draftProfile.name} onChange={(event) => setDraftProfile((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">Rol</label>
                    <Input value={draftProfile.role} onChange={(event) => setDraftProfile((current) => ({ ...current, role: event.target.value }))} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingProfile(false)}>Cerrar</Button>
                  <Button onClick={handleSaveProfile}>Guardar</Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-[12px] border border-white/8 bg-white/5 px-3 py-3">
        <button
          type="button"
          onClick={() => {
            setMenuOpen((value) => !value);
            setNotificationsOpen(false);
            setEditingProfile(false);
          }}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-1 py-0.5 text-left text-white/82 transition-colors hover:text-white"
          aria-label="Abrir menú de usuario"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/6 text-white/88">
            <PersonOutlineRounded sx={{ fontSize: 16 }} />
          </span>
          <span className="block truncate text-sm font-medium text-white">Usuario</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setNotificationsOpen((value) => !value);
            setMenuOpen(false);
            setEditingProfile(false);
          }}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/6 text-white/82 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Abrir notificaciones"
        >
          <NotificationsRounded sx={{ fontSize: 17 }} />
          {hasUnread ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" /> : null}
        </button>
      </div>

      <NotificationsPopover
        notificationsRef={notificationsRef}
        notificationsOpen={notificationsOpen}
        notificationsLoading={notificationsLoading}
        notificationsError={notificationsError}
        notifications={notifications}
        updateMessage={updateMessage}
        updatingOpenClaw={updatingOpenClaw}
        handleOpenClawUpdate={handleOpenClawUpdate}
        align="side"
      />

      {menuOpen ? (
        <div className="absolute left-[calc(100%+0.75rem)] bottom-0 z-40 w-[320px] max-w-[calc(100vw-7rem)] rounded-[18px] border border-neutral-200 bg-white p-3 text-neutral-900 shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between gap-3 px-2 pb-2">
            <div>
              <div className="text-sm font-medium text-neutral-900">Usuario</div>
              <div className="text-xs text-neutral-500">{draftProfile.name || userProfile.name}</div>
            </div>
          </div>

          <div className="space-y-1 border-t border-neutral-200 pt-2">
            <MenuItem
              icon={SyncRounded}
              label={updatingOpenClaw ? "Actualizando..." : "Update"}
              onClick={() => void handleOpenClawUpdate()}
              disabled={updatingOpenClaw}
              trailing={refreshing ? <SyncRounded sx={{ fontSize: 15 }} className="animate-spin text-neutral-400" /> : null}
            />
            <MenuItem icon={EditRounded} label="Editar perfil" onClick={() => setEditingProfile((value) => !value)} />
            <MenuItem icon={SettingsRounded} label="Configuración" onClick={() => { setMenuOpen(false); onOpenSettings?.(); }} />
          </div>

          {updateMessage ? <div className="mt-3 rounded-[12px] border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">{updateMessage}</div> : null}

          {editingProfile ? (
            <div className="mt-3 rounded-[14px] border border-neutral-200 bg-neutral-50 p-3">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">Nombre</label>
                  <Input value={draftProfile.name} onChange={(event) => setDraftProfile((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">Rol</label>
                  <Input value={draftProfile.role} onChange={(event) => setDraftProfile((current) => ({ ...current, role: event.target.value }))} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingProfile(false)}>Cerrar</Button>
                <Button onClick={handleSaveProfile}>Guardar</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


