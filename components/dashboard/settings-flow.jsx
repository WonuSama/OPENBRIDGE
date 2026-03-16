"use client";

import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ConstructionRounded from "@mui/icons-material/ConstructionRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import KeyRounded from "@mui/icons-material/KeyRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import RocketLaunchRounded from "@mui/icons-material/RocketLaunchRounded";
import StorageRounded from "@mui/icons-material/StorageRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OpenRouterModelPicker } from "@/components/dashboard/openrouter-model-picker";
import { api } from "@/components/dashboard/utils";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter", hint: "Modelos de varios proveedores", keyLabel: "OpenRouter API key", model: "google/gemini-2.5-pro", picker: true },
  { id: "openai", label: "OpenAI", hint: "GPT via API oficial", keyLabel: "OpenAI API key", model: "gpt-4.1" },
  { id: "anthropic", label: "Anthropic", hint: "Claude para trabajo largo", keyLabel: "Anthropic API key", model: "claude-sonnet-4-5" },
  { id: "google", label: "Google", hint: "Gemini directo", keyLabel: "Gemini API key", model: "gemini-2.5-pro" },
  { id: "xai", label: "xAI", hint: "Grok via API", keyLabel: "xAI API key", model: "grok-4" },
  { id: "ollama", label: "Ollama", hint: "Modelo local en el VPS", keyLabel: "", model: "llama3.2", baseUrl: "http://127.0.0.1:11434/v1" },
];

const STEP_META = {
  intro: ["Configura el producto una sola vez", "Vamos a conectar el VPS, resolver OpenClaw y dejar el primer agente listo."],
  connection: ["Conecta tu VPS", "Validamos el acceso remoto porque todo lo demas depende de esa conexion."],
  choice: ["Elige como empezar", "Puedes usar una instalacion existente o hacer una instalacion limpia desde este mismo flujo."],
  existing: ["Usar instalacion existente", "Solo necesitamos la ruta y el perfil que la plataforma debe administrar."],
  provider: ["Proveedor, modelo y acceso", "Si eliges un modelo remoto, te pedimos la API key correcta. No vamos a asumir OpenRouter."],
  agent: ["Prepara el primer agente", "Definimos el agente inicial para que el entorno nazca ya usable."],
  finish: ["Todo listo para usar", "Cerramos con una explicacion corta de lo que ya se puede hacer."],
};

function ChoiceButton({ selected, icon: Icon, title, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[24px] border p-5 text-left transition-all",
        selected ? "border-neutral-900 bg-neutral-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]" : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", selected ? "border-white/15 bg-white/10" : "border-neutral-200 bg-neutral-50")}>
          <Icon sx={{ fontSize: 19 }} />
        </div>
        <div>
          <div className={cn("text-base font-semibold tracking-tight", selected ? "text-white" : "text-neutral-950")}>{title}</div>
          <div className={cn("mt-2 text-sm leading-6", selected ? "text-white/72" : "text-neutral-600")}>{detail}</div>
        </div>
      </div>
    </button>
  );
}

function SidePreview({ title, detail, detection }) {
  return (
    <div className="relative hidden overflow-hidden rounded-[28px] border border-neutral-200 bg-[radial-gradient(circle_at_18%_22%,rgba(242,195,107,0.18),transparent_25%),radial-gradient(circle_at_82%_30%,rgba(147,197,253,0.18),transparent_28%),linear-gradient(180deg,#f7f7f4_0%,#f1f4f5_100%)] p-6 lg:flex lg:min-h-[640px] lg:flex-col">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <RocketLaunchRounded sx={{ fontSize: 20 }} />
        </div>
        <div>
          <div className="text-lg font-semibold text-neutral-950">OPENBRIDGE</div>
          <div className="text-sm text-neutral-500">Setup inicial guiado</div>
        </div>
      </div>
      <div className="mt-8 rounded-[24px] border border-white/60 bg-white/70 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.07)] backdrop-blur-sm">
        <div className="text-sm font-medium text-neutral-500">Ahora mismo</div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{title}</div>
        <div className="mt-2 text-sm leading-6 text-neutral-600">{detail}</div>
        <div className="mt-6 space-y-3">
          {[
            "Conecta un VPS o servidor remoto sin exponer datos sensibles en esta vista.",
            detection?.binaryResolved ? `OpenClaw detectado${detection.version ? ` · ${detection.version}` : ""}` : "Vincula o instala OpenClaw desde este flujo.",
            "Define un primer agente genérico y su modelo inicial para dejar el entorno operativo.",
          ].map((text, index) => (
            <div key={index} className="rounded-2xl border border-neutral-200 bg-white/80 px-4 py-4 text-sm leading-6 text-neutral-600 shadow-sm">{text}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsFlow({ setupData, refreshSetup, onCompleted, onCancel, finishLabel = "Finalizar configuracion", allowClose = true }) {
  const [step, setStep] = useState("intro");
  const [installMode, setInstallMode] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dangerAction, setDangerAction] = useState("");
  const [dangerValue, setDangerValue] = useState("");
  const [connection, setConnection] = useState({ host: "", port: 22, username: "root", password: "" });
  const [existingInstall, setExistingInstall] = useState({ binaryPath: "openclaw", profile: "nuevo", stateRoot: "", workspaceRoot: "" });
  const [draft, setDraft] = useState({
    binaryPath: "openclaw",
    profile: "nuevo",
    stateRoot: "/root/.openclaw-nuevo",
    workspaceRoot: "/root/.openclaw-nuevo/workspace",
    provider: "openrouter",
    modelId: "google/gemini-2.5-pro",
    apiKey: "",
    baseUrl: "",
    firstAgentId: "main",
        firstAgentName: "Agente 01",
    firstAgentRole: "Asistente principal",
  });

  const config = setupData?.config;
  const detection = setupData?.detection;
  const activeProvider = useMemo(() => PROVIDERS.find((item) => item.id === draft.provider) || PROVIDERS[0], [draft.provider]);
  const steps = useMemo(() => {
    const base = ["intro", "connection", "choice"];
    if (installMode === "existing") return [...base, "existing", "finish"];
    if (installMode === "fresh") return [...base, "provider", "agent", "finish"];
    return [...base, "finish"];
  }, [installMode]);
  const currentIndex = Math.max(steps.indexOf(step), 0);
  const progress = ((currentIndex + 1) / steps.length) * 100;
  const [title, detail] = STEP_META[step] || STEP_META.intro;

  useEffect(() => {
    if (!setupData?.config) return;
    const next = setupData.config;
    setConnection({ host: next.vps?.host || "", port: Number(next.vps?.port || 22), username: next.vps?.username || "root", password: "" });
    setExistingInstall({
      binaryPath: next.openclaw?.binaryPath || "openclaw",
      profile: next.openclaw?.profile || "nuevo",
      stateRoot: next.openclaw?.stateRoot || "/root/.openclaw-nuevo",
      workspaceRoot: next.openclaw?.workspaceRoot || "/root/.openclaw-nuevo/workspace",
    });
    setDraft((current) => ({
      ...current,
      binaryPath: next.openclaw?.binaryPath || current.binaryPath,
      profile: next.openclaw?.profile || current.profile,
      stateRoot: next.openclaw?.stateRoot || current.stateRoot,
      workspaceRoot: next.openclaw?.workspaceRoot || current.workspaceRoot,
      provider: next.openclaw?.provider || current.provider,
      modelId: next.openclaw?.modelId || current.modelId,
      baseUrl: next.openclaw?.baseUrl || current.baseUrl,
      firstAgentId: next.openclaw?.firstAgentId || current.firstAgentId,
      firstAgentName: next.openclaw?.firstAgentName || current.firstAgentName,
      firstAgentRole: next.openclaw?.firstAgentRole || current.firstAgentRole,
      apiKey: "",
    }));
    setInstallMode(next.openclaw?.installMode === "install" ? "fresh" : next.openclaw?.installMode === "existing" ? "existing" : "");
    setStep(next.onboardingCompleted ? "finish" : "intro");
    setError("");
    setSuccess("");
    setBusy("");
    setDangerAction("");
    setDangerValue("");
  }, [setupData]);

  function goBack() {
    if (step === "connection") setStep("intro");
    if (step === "choice") setStep("connection");
    if (step === "existing" || step === "provider") setStep("choice");
    if (step === "agent") setStep("provider");
    if (step === "finish") setStep(installMode === "fresh" ? "agent" : installMode === "existing" ? "existing" : "choice");
  }

  async function handleAction(action, body, nextStep, okMessage, timeoutMs = 30000) {
    try {
      setBusy(action);
      setError("");
      setSuccess("");
      await api("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs,
      });
      await refreshSetup?.();
      setSuccess(okMessage);
      if (nextStep) setStep(nextStep);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function handleComplete() {
    try {
      setBusy("complete");
      setError("");
      setSuccess("");
      await api("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete-onboarding" }),
      });
      await refreshSetup?.();
      onCompleted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function handleDanger(action) {
    if (action === "clear-connection") {
      await handleAction("clear-connection", { action: "clear-connection", confirmText: dangerValue }, "connection", "Conexion VPS eliminada.");
    }
    if (action === "remove-installation") {
      await handleAction("remove-installation", { action: "remove-installation", confirmText: dangerValue }, "choice", "Instalacion eliminada de la configuracion.");
    }
    setDangerAction("");
    setDangerValue("");
  }

  const connectionConfirmToken = config?.vps?.host || "";
  const installationConfirmToken = config?.openclaw?.stateRoot ? `${config.openclaw.profile || "nuevo"}:${config.openclaw.stateRoot}` : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <SidePreview title={title} detail={detail} detection={detection} />

      <div className="overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="border-b border-neutral-200 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                <span>Paso {currentIndex + 1} de {steps.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full rounded-full bg-gradient-to-r from-[#f2c36b] via-[#8fd6c5] to-[#96dd83] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <div>
                <div className="text-xl font-semibold tracking-tight text-neutral-950">{title}</div>
                <div className="mt-1 text-sm leading-6 text-neutral-600">{detail}</div>
              </div>
            </div>
            {allowClose && onCancel ? <Button variant="outline" onClick={onCancel}>Cerrar</Button> : null}
          </div>
        </div>

        <div className="max-h-[720px] overflow-y-auto px-6 py-6">
          {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {success ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          {step === "intro" ? (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-neutral-200 bg-[radial-gradient(circle_at_15%_20%,rgba(242,195,107,0.12),transparent_24%),radial-gradient(circle_at_85%_30%,rgba(147,197,253,0.12),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8f8f7_100%)] p-6">
                <div className="max-w-2xl text-3xl font-semibold tracking-tight text-neutral-950">Vamos a dejar tu entorno listo para que cualquiera pueda arrancar sin friccion.</div>
                <div className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">Este onboarding cubre conexion, instalacion y creacion del primer agente desde una sola experiencia guiada.</div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-medium text-neutral-900"><LinkRounded sx={{ fontSize: 17 }} /> Conexion guiada</div><div className="mt-2 text-sm leading-6 text-neutral-600">Validamos host, usuario y acceso al VPS desde el mismo panel.</div></div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-medium text-neutral-900"><ConstructionRounded sx={{ fontSize: 17 }} /> Instalacion real</div><div className="mt-2 text-sm leading-6 text-neutral-600">Puedes reutilizar una instalacion existente o hacer una limpia y dejar un primer agente funcional.</div></div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-medium text-neutral-900"><KeyRounded sx={{ fontSize: 17 }} /> Proveedor y acceso</div><div className="mt-2 text-sm leading-6 text-neutral-600">Si eliges un modelo remoto, te pedimos la API key correcta. No vamos a asumir OpenRouter.</div></div>
              </div>
            </div>
          ) : null}

          {step === "connection" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Host</label><Input value={connection.host} onChange={(event) => setConnection((current) => ({ ...current, host: event.target.value }))} placeholder="vps.example.com" /></div>
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Puerto</label><Input value={String(connection.port)} onChange={(event) => setConnection((current) => ({ ...current, port: Number(event.target.value || 22) }))} placeholder="22" /></div>
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Usuario</label><Input value={connection.username} onChange={(event) => setConnection((current) => ({ ...current, username: event.target.value }))} placeholder="root" /></div>
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Contrasena</label><Input type="password" value={connection.password} onChange={(event) => setConnection((current) => ({ ...current, password: event.target.value }))} placeholder={config?.vps?.passwordSet ? "Ya hay una guardada, deja vacio para mantenerla" : "Contrasena SSH"} /></div>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">Esta conexion queda guardada dentro del producto. No hace falta editar <code>.env</code> para un uso normal.</div>
            </div>
          ) : null}

          {step === "choice" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <ChoiceButton selected={installMode === "existing"} onClick={() => setInstallMode("existing")} icon={StorageRounded} title="Usar instalacion existente" detail="Ya tienes OpenClaw en el VPS y solo quieres indicar la ruta y el perfil que la plataforma debe administrar." />
                <ChoiceButton selected={installMode === "fresh"} onClick={() => setInstallMode("fresh")} icon={RocketLaunchRounded} title="Instalar desde cero" detail="La plataforma instala OpenClaw, configura el entorno y deja el primer agente operativo con el proveedor y modelo que elijas." />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                <div>{detection?.binaryResolved ? `Detecte ${detection.binaryResolved}${detection.version ? ` · ${detection.version}` : ""}` : "Si quieres, puedes detectar una instalacion remota antes de elegir."}</div>
                <Button variant="outline" onClick={() => void handleAction("detect", { action: "detect" }, null, "Revise la instalacion remota y actualice el estado.")} disabled={busy === "detect"}><SyncRounded sx={{ fontSize: 15 }} />{busy === "detect" ? "Revisando..." : "Detectar instalacion"}</Button>
              </div>
            </div>
          ) : null}

          {step === "existing" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Ruta de OpenClaw</label><Input value={existingInstall.binaryPath} onChange={(event) => setExistingInstall((current) => ({ ...current, binaryPath: event.target.value }))} placeholder="openclaw o /usr/local/bin/openclaw" /></div>
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Perfil</label><Input value={existingInstall.profile} onChange={(event) => setExistingInstall((current) => ({ ...current, profile: event.target.value }))} /></div>
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">State root</label><Input value={existingInstall.stateRoot} onChange={(event) => setExistingInstall((current) => ({ ...current, stateRoot: event.target.value }))} /></div>
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Workspace root</label><Input value={existingInstall.workspaceRoot} onChange={(event) => setExistingInstall((current) => ({ ...current, workspaceRoot: event.target.value }))} /></div>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">Si esa instalacion ya tiene sus credenciales configuradas en el VPS, no hace falta volver a pedirlas aqui.</div>
            </div>
          ) : null}

          {step === "provider" ? (
            <div className="space-y-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {PROVIDERS.map((provider) => (
                  <ChoiceButton key={provider.id} selected={draft.provider === provider.id} onClick={() => setDraft((current) => ({ ...current, provider: provider.id, modelId: provider.model, baseUrl: provider.id === "ollama" ? current.baseUrl || provider.baseUrl || "" : current.baseUrl }))} icon={provider.id === "ollama" ? StorageRounded : KeyRounded} title={provider.label} detail={provider.hint} />
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Perfil</label><Input value={draft.profile} onChange={(event) => setDraft((current) => ({ ...current, profile: event.target.value }))} /></div>
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Ruta esperada del binario</label><Input value={draft.binaryPath} onChange={(event) => setDraft((current) => ({ ...current, binaryPath: event.target.value }))} placeholder="openclaw" /></div>
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">State root</label><Input value={draft.stateRoot} onChange={(event) => setDraft((current) => ({ ...current, stateRoot: event.target.value }))} /></div>
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Workspace root</label><Input value={draft.workspaceRoot} onChange={(event) => setDraft((current) => ({ ...current, workspaceRoot: event.target.value }))} /></div>
              </div>
              <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5">
                <div className="text-sm font-semibold text-neutral-900">Proveedor elegido: {activeProvider.label}</div>
                <div className="mt-1 text-sm text-neutral-500">{activeProvider.hint}</div>
                <div className="mt-4 space-y-4">
                  {activeProvider.picker ? (
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Modelo inicial</label>
                      <OpenRouterModelPicker value={`openrouter/${draft.modelId}`} defaultModel={`openrouter/${draft.modelId}`} onChange={(value) => setDraft((current) => ({ ...current, provider: "openrouter", modelId: String(value || "").replace(/^openrouter\//, "") }))} />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Modelo inicial</label>
                      <Input value={draft.modelId} onChange={(event) => setDraft((current) => ({ ...current, modelId: event.target.value }))} placeholder={activeProvider.model} />
                    </div>
                  )}
                  {draft.provider !== "ollama" ? (
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">{activeProvider.keyLabel}</label>
                      <Input type="password" value={draft.apiKey} onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))} placeholder={config?.openclaw?.apiKeySet ? "Ya hay una guardada, puedes reemplazarla" : "Pega aqui tu API key"} />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Base URL local</label>
                      <Input value={draft.baseUrl} onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))} placeholder={activeProvider.baseUrl} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {step === "agent" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">ID tecnico</label><Input value={draft.firstAgentId} onChange={(event) => setDraft((current) => ({ ...current, firstAgentId: event.target.value }))} /></div>
                <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Nombre visible</label><Input value={draft.firstAgentName} onChange={(event) => setDraft((current) => ({ ...current, firstAgentName: event.target.value }))} /></div>
              </div>
              <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Funcion principal</label><Input value={draft.firstAgentRole} onChange={(event) => setDraft((current) => ({ ...current, firstAgentRole: event.target.value }))} /></div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">Vamos a crear este agente usando <span className="font-medium text-neutral-900">{`${draft.provider}/${draft.modelId}`}</span>.</div>
            </div>
          ) : null}

          {step === "finish" ? (
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-semibold text-neutral-950"><InfoOutlined sx={{ fontSize: 17 }} /> Workspace</div><div className="mt-2 text-sm leading-6 text-neutral-600">Explora archivos, edita contenido remoto y entiende el estado general del entorno desde una sola consola.</div></div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-semibold text-neutral-950"><InfoOutlined sx={{ fontSize: 17 }} /> Multiagentes</div><div className="mt-2 text-sm leading-6 text-neutral-600">Crea agentes, delega tareas reales y conversa con ellos desde una interfaz pensada para operar el sistema.</div></div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-semibold text-neutral-950"><InfoOutlined sx={{ fontSize: 17 }} /> Salud del sistema</div><div className="mt-2 text-sm leading-6 text-neutral-600">Revisa conexion, recursos y gateway del VPS sin depender todo el tiempo de la terminal.</div></div>
              </div>
              <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5">
                <div className="text-sm font-semibold text-neutral-900">Gestion del entorno</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ChoiceButton selected={false} onClick={() => setStep("connection")} icon={LinkRounded} title="Editar conexion VPS" detail={config?.vps?.host ? "Conexion remota configurada y lista para editar." : "No hay conexion configurada"} />
                  <ChoiceButton selected={false} onClick={() => setStep(config?.openclaw?.installMode === "install" ? "provider" : "existing")} icon={StorageRounded} title="Editar instalacion" detail={config?.openclaw?.binaryPath || "Define una ruta nueva o ajusta la actual"} />
                  <ChoiceButton selected={dangerAction === "clear-connection"} onClick={() => { setDangerAction("clear-connection"); setDangerValue(""); }} icon={LinkRounded} title="Eliminar conexion VPS" detail="Quita host, usuario y credenciales guardadas. Vuelve a primer ingreso." />
                  <ChoiceButton selected={dangerAction === "remove-installation"} onClick={() => { setDangerAction("remove-installation"); setDangerValue(""); }} icon={ConstructionRounded} title={config?.openclaw?.installMode === "install" ? "Eliminar entorno instalado" : "Desvincular instalacion"} detail={config?.openclaw?.installMode === "install" ? "Borra el entorno gestionado y limpia la configuracion actual." : "Quita la ruta actual para poder usar otra instalacion existente."} />
                </div>

                {dangerAction ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="text-sm font-semibold text-red-800">Confirmacion robusta</div>
                    <div className="mt-2 text-sm leading-6 text-red-700">
                      {dangerAction === "clear-connection"
                        ? `Escribe exactamente ${connectionConfirmToken} para eliminar la conexion al VPS.`
                        : `Escribe exactamente ${installationConfirmToken} para ${config?.openclaw?.installMode === "install" ? "eliminar el entorno actual" : "desvincular la instalacion actual"}.`}
                    </div>
                    <div className="mt-4 flex flex-col gap-3 md:flex-row">
                      <Input value={dangerValue} onChange={(event) => setDangerValue(event.target.value)} placeholder={dangerAction === "clear-connection" ? connectionConfirmToken : installationConfirmToken} />
                      <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => { setDangerAction(""); setDangerValue(""); }}>Cancelar</Button>
                        <Button
                          onClick={() => void handleDanger(dangerAction)}
                          disabled={busy === dangerAction || dangerValue !== (dangerAction === "clear-connection" ? connectionConfirmToken : installationConfirmToken)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          {busy === dangerAction ? "Procesando..." : "Confirmar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>{step !== "intro" ? <Button variant="outline" onClick={goBack}><ArrowBackRounded sx={{ fontSize: 16 }} />Volver</Button> : null}</div>
            <div className="flex items-center gap-3">
              {step === "intro" ? <Button onClick={() => setStep("connection")}><ArrowForwardRounded sx={{ fontSize: 16 }} />Empezar</Button> : null}
              {step === "connection" ? <Button onClick={() => void handleAction("connection", { action: "save-connection", vps: connection }, "choice", "Conexion validada. Ya podemos revisar la instalacion.", 20000)} disabled={!connection.host || !connection.username || busy === "connection"}>{busy === "connection" ? "Validando..." : "Guardar y continuar"}</Button> : null}
              {step === "choice" ? <Button onClick={() => setStep(installMode === "existing" ? "existing" : "provider")} disabled={!installMode}>Continuar</Button> : null}
              {step === "existing" ? <Button onClick={() => void handleAction("existing", { action: "use-existing", openclaw: existingInstall }, "finish", "Instalacion existente conectada a la plataforma.")} disabled={busy === "existing"}>{busy === "existing" ? "Guardando..." : "Usar esta instalacion"}</Button> : null}
              {step === "provider" ? <Button onClick={() => setStep("agent")} disabled={!draft.modelId || (draft.provider !== "ollama" && !draft.apiKey)}>Continuar con el agente</Button> : null}
              {step === "agent" ? <Button onClick={() => void handleAction("install", { action: "install-openclaw", openclaw: { ...draft, firstAgentModel: `${draft.provider}/${draft.modelId}` } }, "finish", "Instalacion completada. OpenClaw y el primer agente ya estan listos.", 240000)} disabled={busy === "install" || !draft.firstAgentId || !draft.firstAgentName}>{busy === "install" ? "Instalando..." : "Instalar y preparar entorno"}</Button> : null}
              {step === "finish" ? <Button onClick={() => void handleComplete()} disabled={busy === "complete"}>{busy === "complete" ? "Guardando..." : finishLabel}</Button> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
