import AddAPhotoRounded from "@mui/icons-material/AddAPhotoRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import CleaningServicesRounded from "@mui/icons-material/CleaningServicesRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OpenRouterModelPicker } from "@/components/dashboard/openrouter-model-picker";
import { cn } from "@/lib/utils";

const AGENT_AVATAR_KEY = "openclaw-agent-avatar";
const QUICK_COMMANDS = [
  {
    label: "/status",
    detail: "openclaw --profile nuevo status",
    prompt: "Ejecuta `openclaw --profile nuevo status` y resume el estado actual de esta instancia.",
  },
  {
    label: "/status-deep",
    detail: "openclaw --profile nuevo status --deep",
    prompt: "Ejecuta `openclaw --profile nuevo status --deep` y marca cualquier riesgo o fallo importante.",
  },
  {
    label: "/probe",
    detail: "openclaw --profile nuevo channels status --probe",
    prompt: "Ejecuta `openclaw --profile nuevo channels status --probe` y dime si Telegram y el gateway están sanos.",
  },
  {
    label: "/logs",
    detail: "openclaw --profile nuevo logs --follow",
    prompt: "Revisa el equivalente a `openclaw --profile nuevo logs --follow` y resume los eventos recientes relevantes sin quedarte bloqueado siguiendo logs.",
  },
  {
    label: "/pairing",
    detail: "openclaw --profile nuevo pairing list telegram",
    prompt: "Ejecuta `openclaw --profile nuevo pairing list telegram` y dime si hay solicitudes pendientes.",
  },
  {
    label: "/docs",
    detail: "openclaw docs",
    prompt: "Usa `openclaw docs` como referencia y dime qué comandos son más útiles para mantener esta instancia.",
  },
];

async function postChat(message) {
  const response = await fetch("/api/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Chat error");
  return data;
}

async function fetchAgentInfo() {
  const response = await fetch("/api/agent/info", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Agent info error");
  return data;
}

async function updateMainModel(model) {
  const response = await fetch("/api/agents", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "main", model }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No pude actualizar el modelo");
  return data;
}

export function AgentChatPanel({ className }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingModel, setUpdatingModel] = useState(false);
  const [meta, setMeta] = useState({ model: null, name: "Agente" });
  const [quickOpen, setQuickOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [avatar, setAvatar] = useState("");
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const quickRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    try {
      setAvatar(window.localStorage.getItem(AGENT_AVATAR_KEY) || "");
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchAgentInfo()
      .then((data) => {
        if (!mounted) return;
        setMeta({
          model: data.model || "openrouter/google/gemini-2.5-pro",
          name: data.name || "Agente",
        });
      })
      .catch(() => {
        if (!mounted) return;
        setMeta({ model: "openrouter/google/gemini-2.5-pro", name: "Agente" });
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    function onDocumentClick(event) {
      if (quickRef.current?.contains(event.target)) return;
      setQuickOpen(false);
    }

    if (!quickOpen) return undefined;
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [quickOpen]);

  useEffect(() => {
    function onDocumentClick(event) {
      if (menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
      setModelMenuOpen(false);
    }

    if (!menuOpen) return undefined;
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [menuOpen]);

  function onPickAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setAvatar(result);
      try {
        window.localStorage.setItem(AGENT_AVATAR_KEY, result);
      } catch {}
    };
    reader.readAsDataURL(file);
  }

  async function sendMessage(nextMessage = draft) {
    const value = nextMessage.trim();
    if (!value || sending) return;
    const userMsg = { id: `${Date.now()}-u`, role: "user", text: value, time: "ahora" };
    setMessages((current) => [...current, userMsg]);
    setDraft("");
    setQuickOpen(false);

    try {
      setSending(true);
      const data = await postChat(value);
      setMeta((current) => ({ ...current, model: data.model || current.model || "openrouter/google/gemini-2.5-pro" }));
      setMessages((current) => [...current, { id: `${Date.now()}-a`, role: "agent", text: data.text, time: "ahora" }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `${Date.now()}-e`, role: "agent", text: `No pude obtener respuesta: ${error.message}`, time: "ahora" }]);
    } finally {
      setSending(false);
    }
  }

  async function changeModel(nextModel) {
    try {
      setUpdatingModel(true);
      const data = await updateMainModel(nextModel);
      setMeta((current) => ({ ...current, model: data.model || nextModel }));
    } catch (error) {
      setMessages((current) => [...current, { id: `${Date.now()}-model`, role: "agent", text: `No pude cambiar el modelo: ${error.message}`, time: "ahora" }]);
    } finally {
      setUpdatingModel(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setMenuOpen(false);
    setModelMenuOpen(false);
  }

  function exportChat() {
    const payload = {
      agentId: "main",
      name: meta.name,
      model: meta.model,
      exportedAt: new Date().toISOString(),
      messages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `main-chat-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
    setModelMenuOpen(false);
  }

  function useQuickCommand(command) {
    setDraft(command.prompt);
    setQuickOpen(false);
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col rounded-xl border border-neutral-200 bg-white p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0">
            {avatar ? (
              <div className="h-16 w-16 overflow-hidden rounded-full ring-4 ring-[#f3ead7]">
                <img src={avatar} alt={meta.name} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 ring-4 ring-[#f3ead7]">
                <SmartToyRounded sx={{ fontSize: 30 }} />
              </div>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-white bg-rose-400 text-white shadow-sm"
              aria-label="Cambiar avatar del agente"
            >
              <AddAPhotoRounded sx={{ fontSize: 14 }} />
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[20px] font-semibold tracking-tight text-neutral-950">{meta.name}</h3>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-400">{meta.model || "openrouter/google/gemini-2.5-pro"}</div>
          </div>
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:bg-neutral-50"
            aria-label="Opciones del agente principal"
          >
            <MoreHorizRounded sx={{ fontSize: 16 }} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.45rem)] z-20 min-w-[260px] rounded-lg border border-neutral-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <button
                type="button"
                onClick={() => setModelMenuOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <span className="inline-flex items-center gap-2">
                  <SmartToyRounded sx={{ fontSize: 16 }} />
                  Cambiar modelo
                </span>
                {updatingModel ? <span className="text-[11px] text-neutral-400">Guardando...</span> : null}
              </button>
              {modelMenuOpen ? (
                <div className="px-2 pb-2 pt-1">
                  <OpenRouterModelPicker
                    compact
                    value={meta.model}
                    defaultModel="openrouter/google/gemini-2.5-pro"
                    buttonLabel="Modelo"
                    popoverClassName="sm:left-auto sm:right-0 sm:w-[420px]"
                    onChange={(nextModel) => {
                      void changeModel(nextModel);
                      setModelMenuOpen(false);
                      setMenuOpen(false);
                    }}
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={clearChat}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <CleaningServicesRounded sx={{ fontSize: 16 }} />
                Limpiar chat
              </button>
              <button
                type="button"
                onClick={exportChat}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <SyncRounded sx={{ fontSize: 16 }} />
                Exportar chat actual
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
        <div ref={messagesRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[84%]" : "max-w-[84%]"}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm text-neutral-500">
                <span className="font-medium text-neutral-900">{message.role === "user" ? "Tú" : meta.name}</span>
                <span>{message.time}</span>
              </div>
              <div
                className={
                  message.role === "user"
                    ? "rounded-lg rounded-br-sm bg-[#e9f0fb] px-4 py-4 text-[15px] leading-7 text-neutral-900 break-words whitespace-pre-wrap"
                    : "rounded-lg rounded-bl-sm border border-neutral-200 bg-neutral-50 px-4 py-4 text-[15px] leading-7 text-neutral-900 break-words whitespace-pre-wrap"
                }
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div ref={quickRef} className="relative">
            <Button variant="outline" className="w-full justify-between text-neutral-700" onClick={() => setQuickOpen((current) => !current)}>
              <span className="inline-flex items-center gap-2">
                <BoltRounded sx={{ fontSize: 16 }} />
                Comandos rápidos
              </span>
              <KeyboardArrowDownRounded sx={{ fontSize: 18 }} />
            </Button>
            {quickOpen ? (
              <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-20 rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                {QUICK_COMMANDS.map((command) => (
                  <div key={command.label} className="flex items-start gap-2 rounded-lg px-2 py-1">
                    <button type="button" onClick={() => useQuickCommand(command)} className="flex-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50">
                      <div className="font-mono text-sm text-neutral-900">{command.label}</div>
                      <div className="mt-1 text-xs text-neutral-500">{command.detail}</div>
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => sendMessage(command.prompt)}>
                      Usar
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribe un mensaje"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
            />
            <Button onClick={() => sendMessage()} disabled={sending}>
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
