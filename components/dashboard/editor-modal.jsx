import LightbulbRounded from "@mui/icons-material/LightbulbRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEditorRecommendations } from "@/components/dashboard/recommendations";
import { fileName, fmtBytes, parentLabel } from "@/components/dashboard/utils";

export function EditorModal({ open, onClose, selectedFile, fileData, saveFile, saving, setFileData }) {
  const [initialContent, setInitialContent] = useState("");

  useEffect(() => {
    if (!open) return;
    setInitialContent(fileData.content || "");
  }, [open, selectedFile, fileData.content]);

  const recommendations = getEditorRecommendations(selectedFile);
  const isDirty = useMemo(() => fileData.isText && (fileData.content || "") !== initialContent, [fileData.content, fileData.isText, initialContent]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        void handleClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isDirty, initialContent, fileData.content]);

  async function handleClose() {
    if (!isDirty) {
      onClose();
      return;
    }

    const shouldSave = window.confirm("Hay cambios sin guardar. ¿Quieres guardarlos antes de cerrar?");
    if (shouldSave) {
      await saveFile();
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) void handleClose(); }}>
      <div className="grid h-[88vh] w-full max-w-[1380px] gap-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.16)] xl:grid-cols-[minmax(0,1fr)_340px]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-neutral-950">{selectedFile ? fileName(selectedFile) : "Editor remoto"}</div>
              <div className="mt-1 truncate text-sm text-neutral-500">{selectedFile ? `${selectedFile} • ${fileData.mimeType || "desconocido"} • ${fmtBytes(fileData.size)}` : "Selecciona un archivo para editar."}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void handleClose()}>Cerrar</Button>
              <Button onClick={saveFile} disabled={!fileData.isText || !selectedFile || saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-neutral-200 px-5 py-4 sm:grid-cols-3">
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3"><div className="text-xs uppercase tracking-[0.12em] text-neutral-400">Archivo</div><div className="mt-1 truncate text-sm font-medium text-neutral-900">{selectedFile ? fileName(selectedFile) : "-"}</div></div>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3"><div className="text-xs uppercase tracking-[0.12em] text-neutral-400">Ubicación</div><div className="mt-1 truncate text-sm font-medium text-neutral-900">{selectedFile ? parentLabel(selectedFile) : "-"}</div></div>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3"><div className="text-xs uppercase tracking-[0.12em] text-neutral-400">Estado</div><div className="mt-1 text-sm font-medium text-neutral-900">{fileData.isText ? (isDirty ? "Cambios sin guardar" : "Sin cambios") : "Binario / no compatible"}</div></div>
          </div>

          <div className="min-h-0 flex-1 px-5 py-5">
            <textarea value={fileData.content} onChange={(event) => setFileData((current) => ({ ...current, content: event.target.value }))} disabled={!fileData.isText} placeholder="Selecciona un archivo para empezar a editar." className="h-full min-h-[420px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4 font-mono text-[13px] leading-6 text-neutral-900 outline-none transition-[border-color,box-shadow] placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-[3px] focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60" />
          </div>
        </div>

        <aside className="min-h-0 overflow-y-auto border-l border-neutral-200 bg-neutral-50/70 px-4 py-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-900"><LightbulbRounded sx={{ fontSize: 18 }} />Recomendaciones</div>
          <div className="space-y-3">
            {recommendations.map((item) => (
              <Card key={item.id} className="gap-3 bg-white py-4">
                <CardHeader className="px-4 pb-0">
                  <div className="flex items-start gap-2"><DescriptionRounded sx={{ fontSize: 17 }} className="mt-0.5 text-neutral-500" /><CardTitle className="text-sm">{item.title}</CardTitle></div>
                </CardHeader>
                <CardContent className="px-4"><p className="text-sm leading-6 text-neutral-600">{item.detail}</p></CardContent>
              </Card>
            ))}
          </div>
        </aside>
      </div>
      <button className="sr-only" onClick={() => void handleClose()} aria-label="Cerrar editor"><CloseRounded /></button>
    </div>
  );
}
