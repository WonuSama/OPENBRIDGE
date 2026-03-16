"use client";

import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/components/dashboard/utils";

function fmtContextLength(value) {
  const amount = Number(value || 0);
  if (!amount) return "-";
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return String(amount);
}

function normalizeOpenRouterModelId(value, fallback = "") {
  const raw = String(value || fallback || "").trim();
  if (!raw) return "";
  if (raw.startsWith("openrouter/")) return raw;
  return `openrouter/${raw.replace(/^\/+/, "")}`;
}

export function OpenRouterModelPicker({
  value,
  onChange,
  defaultModel,
  compact = false,
  buttonLabel = "Seleccionar modelo",
  popoverClassName = "",
  placement = "bottom",
}) {
  const [open, setOpen] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [modelCatalog, setModelCatalog] = useState({ total: 0, providers: [], models: [] });
  const popoverRef = useRef(null);

  async function loadModels() {
    try {
      setModelsLoading(true);
      setModelsError("");
      const data = await api("/api/models/openrouter");
      setModelCatalog({
        total: data.total || 0,
        providers: data.providers || [],
        models: data.models || [],
      });
    } catch (error) {
      setModelsError(error.message);
    } finally {
      setModelsLoading(false);
    }
  }

  useEffect(() => {
    function onPointerDown(event) {
      if (popoverRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    if (!open) return undefined;
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || modelCatalog.models.length) return;
    loadModels();
  }, [open, modelCatalog.models.length]);

  const filteredProviders = useMemo(() => {
    const term = modelSearch.trim().toLowerCase();
    if (!term) return modelCatalog.providers;
    return modelCatalog.providers
      .map((provider) => ({
        ...provider,
        models: provider.models.filter(
          (model) =>
            model.name.toLowerCase().includes(term) ||
            model.id.toLowerCase().includes(term) ||
            model.provider.toLowerCase().includes(term),
        ),
      }))
      .filter((provider) => provider.models.length);
  }, [modelCatalog.providers, modelSearch]);

  const filteredCount = filteredProviders.reduce((total, provider) => total + provider.models.length, 0);
  const selectedValue = normalizeOpenRouterModelId(value, defaultModel);
  const openAbove = placement === "top";

  return (
    <div ref={popoverRef} className="relative max-w-full">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 border border-neutral-200 text-left transition-colors hover:bg-white ${
          compact ? "rounded-md bg-white px-3 py-2" : "rounded-lg bg-neutral-50 px-4 py-2.5"
        }`}
      >
        <div className="min-w-0">
          {!compact ? <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">{buttonLabel}</div> : null}
          <div className={`truncate font-medium text-neutral-900 ${compact ? "text-sm" : "text-sm"}`}>{selectedValue}</div>
          {!compact ? <div className="mt-1 text-xs text-neutral-500">Catalogo real de OpenRouter.</div> : null}
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
        <div
          className={`absolute left-0 z-30 w-full max-w-[min(100vw-2rem,680px)] rounded-xl border border-neutral-200 bg-white p-2.5 shadow-[0_24px_60px_rgba(15,23,42,0.16)] ${openAbove ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"} ${popoverClassName}`.trim()}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-neutral-900">Seleccionar modelo</div>
            <Button type="button" variant="outline" size="sm" onClick={loadModels}>
              <SyncRounded sx={{ fontSize: 15 }} />
              Actualizar
            </Button>
          </div>

          <div className="mt-2.5 relative">
            <SearchRounded sx={{ fontSize: 16 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              value={modelSearch}
              onChange={(event) => setModelSearch(event.target.value)}
              placeholder="Buscar Google, OpenAI, xAI, Anthropic, Kimi..."
              className="pl-9"
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-neutral-500">
            <span>{modelsLoading ? "Cargando catalogo..." : `${filteredCount || modelCatalog.total} modelos disponibles`}</span>
            <button
              type="button"
              onClick={() => {
                            onChange(normalizeOpenRouterModelId(defaultModel));
                            setOpen(false);
                          }}
              className="font-medium text-neutral-700 transition-colors hover:text-neutral-950"
            >
              Usar modelo del sistema
            </button>
          </div>

          {modelsError ? <div className="mt-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{modelsError}</div> : null}

          <div className="mt-2.5 max-h-[300px] overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50">
            {filteredProviders.length ? (
              filteredProviders.map((provider) => (
                <div key={provider.provider} className="border-b border-neutral-100 last:border-b-0">
                  <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-neutral-100 bg-white/95 px-3 py-2 backdrop-blur-sm">
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">{provider.provider}</div>
                    <div className="text-[11px] text-neutral-400">{provider.models.length}</div>
                  </div>
                  <div className="p-2">
                    {provider.models.map((model) => {
                      const nextModelId = normalizeOpenRouterModelId(model.id);
                      const active = selectedValue === nextModelId;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            onChange(nextModelId);
                            setOpen(false);
                          }}
                          className={`mb-2 flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors last:mb-0 ${
                            active ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200 bg-white hover:bg-neutral-50"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-sm font-medium ${active ? "text-white" : "text-neutral-900"}`}>{model.name}</div>
                            <div className={`mt-1 truncate text-xs ${active ? "text-white/70" : "text-neutral-500"}`}>{nextModelId}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className={`text-xs font-medium ${active ? "text-white/80" : "text-neutral-600"}`}>{fmtContextLength(model.contextLength)}</div>
                            <div className={`mt-1 text-[11px] ${active ? "text-white/60" : "text-neutral-400"}`}>{model.promptPriceLabel}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-neutral-500">No encontre modelos con ese filtro.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
