"use client";

import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import SourceRounded from "@mui/icons-material/SourceRounded";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/shared";
import { api, fileName, fmtBytes, fmtDate, parentLabel } from "@/components/dashboard/utils";

function ExplorerItem({ item, onOpenDir, onOpenFile, onRename, onDelete, menuOpen, setMenuOpen }) {
  const isDir = item.type === "directory";
  const menuRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (menuRef.current?.contains(event.target)) return;
      setMenuOpen("");
    }
    if (!menuOpen) return undefined;
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen, setMenuOpen]);

  return (
    <div className="group flex items-center gap-3 rounded-[14px] border border-neutral-200/70 bg-white px-3 py-2.5 transition-colors hover:border-neutral-300 hover:bg-neutral-50">
      <button type="button" onClick={() => (isDir ? onOpenDir(item.path) : onOpenFile(item.path))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-neutral-200 bg-neutral-50 text-neutral-600">
          {isDir ? <FolderOpenRounded sx={{ fontSize: 20 }} /> : <DescriptionRounded sx={{ fontSize: 19 }} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium text-neutral-900">{item.name}</div>
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-500">
              {isDir ? "Carpeta" : "Archivo"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            <span>{isDir ? "Abrir directorio" : fmtBytes(item.size)}</span>
            <span className="text-neutral-300">•</span>
            <span>{fmtDate(item.mtimeEpoch)}</span>
          </div>
        </div>
        <ChevronRightRounded className="shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" sx={{ fontSize: 18 }} />
      </button>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen(menuOpen ? "" : item.path)}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          aria-label={`Acciones para ${item.name}`}
        >
          <MoreHorizRounded sx={{ fontSize: 18 }} />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-[calc(100%+0.4rem)] z-20 min-w-[180px] rounded-[12px] border border-neutral-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <button
              type="button"
              onClick={() => {
                setMenuOpen("");
                onRename(item);
              }}
              className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
            >
              Editar nombre
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen("");
                onDelete(item);
              }}
              className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              Eliminar {isDir ? "carpeta" : "archivo"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, detail, confirmLabel, danger = false, value, onChange, expected, onClose, onConfirm, processing, placeholder }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[140] bg-[rgba(15,23,42,0.22)] backdrop-blur-[2px]">
      <div className="flex min-h-full items-center justify-center px-4 py-6">
        <div className="w-full max-w-lg rounded-[14px] border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="border-b border-neutral-200 px-5 py-4">
            <div className="text-base font-semibold text-neutral-950">{title}</div>
            <div className="mt-1 text-sm leading-6 text-neutral-500">{detail}</div>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[10px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              Escribe exactamente <span className="font-semibold text-neutral-950">{expected}</span> para continuar.
            </div>
            <input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder || expected}
              className="flex h-11 w-full rounded-[10px] border border-neutral-200 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-400"
            />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className={danger ? "bg-red-600 text-white hover:bg-red-700" : ""} onClick={onConfirm} disabled={processing || value !== expected}>
              {processing ? "Procesando..." : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceTab({ tree, loadTree, filteredItems, openFile, largestItems }) {
  const [menuOpen, setMenuOpen] = useState("");
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteValue, setDeleteValue] = useState("");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");

  const visiblePath = tree.currentPath || "/";
  const compactSummary = useMemo(
    () => [
      { label: "Ruta", value: visiblePath },
      { label: "Visibles", value: String(filteredItems.length) },
      { label: "Binario", value: ".openclaw-nuevo" },
    ],
    [filteredItems.length, visiblePath],
  );

  async function refreshCurrentTree() {
    await loadTree(tree.currentPath || "", "state");
  }

  async function handleRename() {
    if (!renameTarget) return;
    try {
      setBusy("rename");
      setActionError("");
      await api("/api/workspace/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename",
          scope: "state",
          path: renameTarget.path,
          newName: renameValue,
        }),
      });
      setRenameTarget(null);
      setRenameValue("");
      await refreshCurrentTree();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy("");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setBusy("delete");
      setActionError("");
      await api("/api/workspace/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          scope: "state",
          path: deleteTarget.path,
          confirmText: deleteValue,
        }),
      });
      setDeleteTarget(null);
      setDeleteValue("");
      await refreshCurrentTree();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section>
      <ConfirmModal
        open={Boolean(renameTarget)}
        title="Editar nombre"
        detail={renameTarget ? `Vas a renombrar ${renameTarget.type === "directory" ? "la carpeta" : "el archivo"} ${renameTarget.name}.` : ""}
        confirmLabel="Renombrar"
        value={renameValue}
        onChange={setRenameValue}
        expected={renameTarget?.name || ""}
        placeholder={renameTarget?.name || ""}
        onClose={() => {
          setRenameTarget(null);
          setRenameValue("");
          setActionError("");
        }}
        onConfirm={handleRename}
        processing={busy === "rename"}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`Eliminar ${deleteTarget?.type === "directory" ? "carpeta" : "archivo"}`}
        detail={deleteTarget ? `Esta acción elimina ${deleteTarget.type === "directory" ? "la carpeta completa y su contenido" : "el archivo"} de la instalación.` : ""}
        confirmLabel="Eliminar"
        danger
        value={deleteValue}
        onChange={setDeleteValue}
        expected={deleteTarget?.name || ""}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteValue("");
          setActionError("");
        }}
        onConfirm={handleDelete}
        processing={busy === "delete"}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_300px]">
        <Card>
          <CardHeader className="border-b border-neutral-100 px-5 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-[1.02rem]">Explorador de instalación</CardTitle>
                <CardDescription>{tree.currentPath || ".openclaw-nuevo"}</CardDescription>
                <div className="mt-3 flex flex-wrap gap-2">
                  {compactSummary.map((item) => (
                    <div key={item.label} className="inline-flex min-w-0 items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600">
                      {item.label === "Binario" ? <SourceRounded sx={{ fontSize: 14 }} /> : null}
                      <span className="font-medium text-neutral-900">{item.label}:</span>
                      <span className="truncate">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => loadTree(tree.parentPath || "", "state")} disabled={tree.parentPath === null}>
                  Regresar
                </Button>
                <Button variant="outline" size="sm" onClick={() => loadTree("", "state")}>
                  <HomeRounded sx={{ fontSize: 16 }} />
                  Raíz
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-5">
            {actionError ? <div className="mb-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div> : null}
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {filteredItems.length ? (
                filteredItems.map((item) => (
                  <ExplorerItem
                    key={item.path}
                    item={item}
                    menuOpen={menuOpen === item.path}
                    setMenuOpen={(value) => setMenuOpen(value)}
                    onOpenDir={(path) => loadTree(path, "state")}
                    onOpenFile={(path) => openFile(path, "state")}
                    onRename={(target) => {
                      setRenameTarget(target);
                      setRenameValue(target.name);
                      setActionError("");
                    }}
                    onDelete={(target) => {
                      setDeleteTarget(target);
                      setDeleteValue("");
                      setActionError("");
                    }}
                  />
                ))
              ) : (
                <EmptyState title="No hay contenido visible" detail="Esta ubicación está vacía o el filtro actual no devuelve resultados." />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b border-neutral-100 px-4 pb-3">
              <CardTitle className="text-[0.98rem]">Archivos más pesados</CardTitle>
              <CardDescription>Accesos rápidos dentro de la instalación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-4 py-4">
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {largestItems.length ? (
                  largestItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => openFile(item.path, "state")}
                      className="flex w-full items-center justify-between gap-4 rounded-[12px] border border-neutral-200 px-3 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-neutral-900">{fileName(item.path)}</div>
                        <div className="truncate text-xs text-neutral-500">{parentLabel(item.path)}</div>
                      </div>
                      <div className="shrink-0 text-xs font-medium text-neutral-700">{fmtBytes(item.size)}</div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">Todavía no hay archivos indexados en esta vista.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
