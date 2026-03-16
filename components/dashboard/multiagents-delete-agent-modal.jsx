"use client";

import { Button } from "@/components/ui/button";

export function MultiagentsDeleteAgentModal({ open, agentName, deleting, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/25 backdrop-blur-[2px]">
      <div className="flex min-h-full items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
          <div className="text-base font-semibold text-neutral-950">Eliminar agente</div>
          <div className="mt-2 text-sm leading-6 text-neutral-500">
            Vas a eliminar por completo <span className="font-medium text-neutral-900">{agentName}</span> de `.openclaw-nuevo`. Esta accion borra su workspace y su estado aislado.
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={deleting}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
              {deleting ? "Eliminando..." : "Eliminar agente"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
