"use client";

import ConstructionRounded from "@mui/icons-material/ConstructionRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import DnsRounded from "@mui/icons-material/DnsRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OpenRouterModelPicker } from "@/components/dashboard/openrouter-model-picker";
import { api } from "@/components/dashboard/utils";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter", hint: "Router de modelos", keyLabel: "OpenRouter API key", model: "google/gemini-2.5-pro", picker: true },
  { id: "openai", label: "OpenAI", hint: "GPT via API oficial", keyLabel: "OpenAI API key", model: "gpt-4.1" },
  { id: "anthropic", label: "Anthropic", hint: "Claude", keyLabel: "Anthropic API key", model: "claude-sonnet-4-5" },
  { id: "google", label: "Google", hint: "Gemini directo", keyLabel: "Gemini API key", model: "gemini-2.5-pro" },
  { id: "xai", label: "xAI", hint: "Grok via API", keyLabel: "xAI API key", model: "grok-4" },
  { id: "ollama", label: "Ollama", hint: "Modelo local en el VPS", keyLabel: "", model: "llama3.2", baseUrl: "http://127.0.0.1:11434/v1" },
];

const SETTINGS_TABS = [
  { id: "vps", label: "VPS", icon: DnsRounded },
  { id: "install", label: "Instalación", icon: ConstructionRounded },
  { id: "agent", label: "Agente inicial", icon: SmartToyRounded },
  { id: "danger", label: "Zona sensible", icon: WarningAmberRounded },
];

function Section({ icon: Icon, title, detail, children, aside }) {
  return (
    <section className="rounded-[10px] border border-neutral-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-neutral-200 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-neutral-950">
            <Icon sx={{ fontSize: 18 }} />
            {title}
          </div>
          {detail ? <div className="mt-1 text-sm leading-6 text-neutral-500">{detail}</div> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ ok, text }) {
  return <span className={cn("inline-flex items-center rounded-sm border px-2.5 py-1 text-xs font-medium", ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{text}</span>;
}

function ProviderButton({ active, provider, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[8px] border px-3 py-3 text-left transition-colors",
        active ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50",
      )}
    >
      <div className="text-sm font-medium">{provider.label}</div>
      <div className={cn("mt-1 text-xs", active ? "text-white/68" : "text-neutral-500")}>{provider.hint}</div>
    </button>
  );
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-[8px] border px-3 py-2 text-sm transition-colors",
        active ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900",
      )}
    >
      <Icon sx={{ fontSize: 16 }} />
      {label}
    </button>
  );
}

export function SettingsTab({ setupData, refreshSetup, onCompleted }) {
  const config = setupData?.config;
  const detection = setupData?.detection;
  const [activeTab, setActiveTab] = useState("vps");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dangerAction, setDangerAction] = useState("");
  const [dangerValue, setDangerValue] = useState("");
  const [connection, setConnection] = useState({ host: "", port: 22, username: "root", password: "", privateKeyPath: "", privateKeyPassphrase: "" });
  const [installation, setInstallation] = useState({
    binaryPath: "openclaw",
    profile: "nuevo",
    stateRoot: "",
    workspaceRoot: "",
    installMode: "existing",
    provider: "openrouter",
    modelId: "google/gemini-2.5-pro",
    apiKey: "",
    baseUrl: "",
    firstAgentId: "main",
      firstAgentName: "Agente 01",
    firstAgentRole: "Asistente principal",
  });

  const activeProvider = useMemo(() => PROVIDERS.find((item) => item.id === installation.provider) || PROVIDERS[0], [installation.provider]);
  const connectionConfirmToken = config?.vps?.host || "";
  const installationConfirmToken = config?.openclaw?.stateRoot ? `${config.openclaw.profile || "nuevo"}:${config.openclaw.stateRoot}` : "";

  useEffect(() => {
    if (!config) return;
    setConnection({
      host: config.vps?.host || "",
      port: Number(config.vps?.port || 22),
      username: config.vps?.username || "root",
      password: config.vps?.passwordSet ? "********" : "",
      privateKeyPath: config.vps?.privateKeyPath || "",
      privateKeyPassphrase: config.vps?.privateKeyPassphraseSet ? "********" : "",
    });
    setInstallation({
      binaryPath: config.openclaw?.binaryPath || "openclaw",
      profile: config.openclaw?.profile || "nuevo",
      stateRoot: config.openclaw?.stateRoot || `/root/.openclaw-${config.openclaw?.profile || "nuevo"}`,
      workspaceRoot: config.openclaw?.workspaceRoot || `${config.openclaw?.stateRoot || `/root/.openclaw-${config.openclaw?.profile || "nuevo"}`}/workspace`,
      installMode: config.openclaw?.installMode || "existing",
      provider: config.openclaw?.provider || "openrouter",
      modelId: config.openclaw?.modelId || "google/gemini-2.5-pro",
      apiKey: config.openclaw?.apiKeySet ? "********" : "",
      baseUrl: config.openclaw?.baseUrl || "",
      firstAgentId: config.openclaw?.firstAgentId || "main",
      firstAgentName: config.openclaw?.firstAgentName || "Agente 01",
      firstAgentRole: config.openclaw?.firstAgentRole || "Asistente principal",
    });
    setBusy("");
    setError("");
    setSuccess("");
    setDangerAction("");
    setDangerValue("");
  }, [config]);

  async function handleAction(action, body, successMessage, timeoutMs = 30000) {
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
      if (successMessage) setSuccess(successMessage);
      onCompleted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function handleSaveConnection() {
    await handleAction(
      "save-connection",
      {
        action: "save-connection",
        vps: {
          ...connection,
          password: /^\*+$/.test(connection.password) ? "" : connection.password,
          privateKeyPassphrase: /^\*+$/.test(connection.privateKeyPassphrase) ? "" : connection.privateKeyPassphrase,
        },
      },
      "Conexión VPS actualizada.",
      20000,
    );
  }

  async function handleSaveInstallation() {
    await handleAction(
      "update-installation",
      {
        action: "update-installation",
        openclaw: {
          ...installation,
          apiKey: /^\*+$/.test(installation.apiKey) ? "" : installation.apiKey,
        },
      },
      "Instalación actualizada.",
      30000,
    );
  }

  async function handleDetect() {
    await handleAction("detect", { action: "detect" }, "Instalación revisada.", 30000);
  }

  async function handleDangerConfirm() {
    if (dangerAction === "clear-connection") {
      await handleAction("clear-connection", { action: "clear-connection", confirmText: dangerValue }, "Conexión VPS eliminada.");
    }
    if (dangerAction === "remove-installation") {
      await handleAction("remove-installation", { action: "remove-installation", confirmText: dangerValue }, "Instalación eliminada de OPENBRIDGE.", 60000);
    }
    setDangerAction("");
    setDangerValue("");
  }

  const canConfirmDanger = dangerAction === "clear-connection" ? dangerValue === connectionConfirmToken : dangerAction === "remove-installation" ? dangerValue === installationConfirmToken : false;

  return (
    <section className="space-y-5">
      <div className="rounded-[10px] border border-neutral-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-neutral-950">
              <SettingsRounded sx={{ fontSize: 20 }} />
              {"OPENBRIDGE Configuración"}
            </div>
            <div className="mt-1 text-sm leading-6 text-neutral-500">{"Administra la conexión remota, la instalación y la base operativa del entorno desde una vista de configuración real."}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill ok={Boolean(config?.vps?.host)} text={config?.vps?.host ? "VPS conectado" : "Sin VPS"} />
            <StatusPill ok={Boolean(detection?.binaryResolved)} text={detection?.binaryResolved ? "OpenClaw detectado" : "Sin detección"} />
          </div>
        </div>
      </div>

      {error ? <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {SETTINGS_TABS.map((tab) => (
              <TabButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} label={tab.label} onClick={() => setActiveTab(tab.id)} />
            ))}
          </div>

          {activeTab === "vps" ? (
            <Section
              icon={DnsRounded}
              title={"Conexión VPS"}
              detail="Edita host, usuario y credenciales sin salir del producto."
              aside={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setConnection({
                        host: "",
                        port: 22,
                        username: "root",
                        password: "",
                        privateKeyPath: "",
                        privateKeyPassphrase: "",
                      })
                    }
                  >
                    Cambiar de VPS
                  </Button>
                  <Button variant="outline" onClick={handleSaveConnection} disabled={busy === "save-connection" || !connection.host || !connection.username}>{busy === "save-connection" ? "Guardando..." : "Guardar conexión"}</Button>
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Host"><Input value={connection.host} onChange={(event) => setConnection((current) => ({ ...current, host: event.target.value }))} placeholder="vps.example.com" /></Field>
                <Field label="Puerto"><Input value={String(connection.port)} onChange={(event) => setConnection((current) => ({ ...current, port: Number(event.target.value || 22) }))} placeholder="22" /></Field>
                <Field label="Usuario"><Input value={connection.username} onChange={(event) => setConnection((current) => ({ ...current, username: event.target.value }))} placeholder="root" /></Field>
                <Field label={"Contraseña"}><Input type="password" value={connection.password} onChange={(event) => setConnection((current) => ({ ...current, password: event.target.value }))} placeholder={"Contraseña SSH"} /></Field>
                <Field label="Ruta de clave privada"><Input value={connection.privateKeyPath} onChange={(event) => setConnection((current) => ({ ...current, privateKeyPath: event.target.value }))} placeholder="~/.ssh/id_ed25519" /></Field>
                <Field label="Passphrase de la clave"><Input type="password" value={connection.privateKeyPassphrase} onChange={(event) => setConnection((current) => ({ ...current, privateKeyPassphrase: event.target.value }))} placeholder="Opcional" /></Field>
              </div>
            </Section>
          ) : null}

          {activeTab === "install" ? (
            <Section
              icon={ConstructionRounded}
              title={"Instalación OpenClaw"}
              detail={"Ajusta la ruta del binario, el perfil y el proveedor por defecto del entorno que administra OPENBRIDGE."}
              aside={
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleDetect} disabled={busy === "detect"}><RefreshRounded sx={{ fontSize: 15 }} />{busy === "detect" ? "Revisando..." : "Detectar"}</Button>
                  <Button onClick={handleSaveInstallation} disabled={busy === "update-installation"}>{busy === "update-installation" ? "Guardando..." : "Guardar instalación"}</Button>
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ruta de OpenClaw"><Input value={installation.binaryPath} onChange={(event) => setInstallation((current) => ({ ...current, binaryPath: event.target.value }))} placeholder="openclaw o /usr/local/bin/openclaw" /></Field>
                <Field label="Perfil"><Input value={installation.profile} onChange={(event) => setInstallation((current) => ({ ...current, profile: event.target.value }))} /></Field>
                <Field label="State root"><Input value={installation.stateRoot} onChange={(event) => setInstallation((current) => ({ ...current, stateRoot: event.target.value }))} /></Field>
                <Field label="Workspace root"><Input value={installation.workspaceRoot} onChange={(event) => setInstallation((current) => ({ ...current, workspaceRoot: event.target.value }))} /></Field>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {PROVIDERS.map((provider) => (
                  <ProviderButton
                    key={provider.id}
                    provider={provider}
                    active={installation.provider === provider.id}
                    onClick={() => setInstallation((current) => ({
                      ...current,
                      provider: provider.id,
                      modelId: current.provider === provider.id ? current.modelId : provider.model,
                      baseUrl: provider.id === "ollama" ? current.baseUrl || provider.baseUrl || "" : current.baseUrl,
                    }))}
                  />
                ))}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <Field label="Modelo por defecto">
                    {activeProvider.picker ? (
                      <OpenRouterModelPicker
                        value={`openrouter/${installation.modelId}`}
                        defaultModel={`openrouter/${installation.modelId}`}
                        onChange={(value) => setInstallation((current) => ({ ...current, provider: "openrouter", modelId: String(value || "").replace(/^openrouter\//, "") }))}
                        placement="top"
                      />
                    ) : (
                      <Input value={installation.modelId} onChange={(event) => setInstallation((current) => ({ ...current, modelId: event.target.value }))} placeholder={activeProvider.model} />
                    )}
                  </Field>
                </div>
                <div>
                  {installation.provider === "ollama" ? (
                    <Field label="Base URL local"><Input value={installation.baseUrl} onChange={(event) => setInstallation((current) => ({ ...current, baseUrl: event.target.value }))} placeholder={activeProvider.baseUrl} /></Field>
                  ) : (
                    <Field label={activeProvider.keyLabel}><Input type="password" value={installation.apiKey} onChange={(event) => setInstallation((current) => ({ ...current, apiKey: event.target.value }))} placeholder={"Pega aquí tu API key"} /></Field>
                  )}
                </div>
              </div>
            </Section>
          ) : null}

          {activeTab === "agent" ? (
            <Section
              icon={SmartToyRounded}
              title="Primer agente"
              detail="Estos datos quedan como referencia inicial del entorno y ayudan a documentar la base operativa."
              aside={<Button variant="outline" onClick={handleSaveInstallation} disabled={busy === "update-installation"}><EditRounded sx={{ fontSize: 15 }} />Actualizar</Button>}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={"ID técnico"}><Input value={installation.firstAgentId} onChange={(event) => setInstallation((current) => ({ ...current, firstAgentId: event.target.value }))} /></Field>
                <Field label="Nombre visible"><Input value={installation.firstAgentName} onChange={(event) => setInstallation((current) => ({ ...current, firstAgentName: event.target.value }))} /></Field>
                <Field label={"Función principal"}><Input value={installation.firstAgentRole} onChange={(event) => setInstallation((current) => ({ ...current, firstAgentRole: event.target.value }))} /></Field>
              </div>
            </Section>
          ) : null}

          {activeTab === "danger" ? (
            <Section
              icon={WarningAmberRounded}
              title="Zona sensible"
              detail="Estas acciones limpian la configuración o desvinculan/eliminan la instalación actual."
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <button type="button" onClick={() => { setDangerAction("clear-connection"); setDangerValue(""); }} className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-4 text-left transition-colors hover:bg-red-100">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-800"><DeleteOutlineRounded sx={{ fontSize: 16 }} />Eliminar conexión VPS</div>
                  <div className="mt-1 text-sm leading-6 text-red-700">Quita host, credenciales y vuelve a estado de primer ingreso.</div>
                </button>
                <button type="button" onClick={() => { setDangerAction("remove-installation"); setDangerValue(""); }} className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-4 text-left transition-colors hover:bg-red-100">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-800"><ConstructionRounded sx={{ fontSize: 16 }} />{config?.openclaw?.installMode === "install" ? "Eliminar entorno instalado" : "Desvincular instalación"}</div>
                  <div className="mt-1 text-sm leading-6 text-red-700">{config?.openclaw?.installMode === "install" ? "Borra el entorno gestionado por OPENBRIDGE y limpia su vinculación." : "Quita la ruta actual para poder conectar otra instalación existente."}</div>
                </button>
              </div>

              {dangerAction ? (
                <div className="mt-4 rounded-[8px] border border-red-200 bg-white p-4">
                  <div className="text-sm font-semibold text-neutral-950">Confirmación obligatoria</div>
                  <div className="mt-2 text-sm leading-6 text-neutral-600">
                    {dangerAction === "clear-connection"
                      ? `Escribe exactamente ${connectionConfirmToken} para eliminar la conexión al VPS.`
                      : `Escribe exactamente ${installationConfirmToken} para ${config?.openclaw?.installMode === "install" ? "eliminar el entorno" : "desvincular la instalación"}.`}
                  </div>
                  <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                    <Input value={dangerValue} onChange={(event) => setDangerValue(event.target.value)} placeholder={dangerAction === "clear-connection" ? connectionConfirmToken : installationConfirmToken} />
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => { setDangerAction(""); setDangerValue(""); }}>Cancelar</Button>
                      <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDangerConfirm} disabled={!canConfirmDanger || busy === dangerAction}>{busy === dangerAction ? "Procesando..." : "Confirmar"}</Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </Section>
          ) : null}
        </div>

        <div className="space-y-5">
          <Section icon={LinkRounded} title="Resumen actual" detail="Lectura rápida del entorno conectado.">
            <div className="space-y-3 text-sm text-neutral-600">
              <div className="rounded-[8px] border border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">OpenClaw</div>
                <div className="mt-1 font-medium text-neutral-900">{detection?.binaryResolved || config?.openclaw?.binaryPath || "Sin ruta configurada"}</div>
                <div className="mt-1 text-xs text-neutral-500">{config?.openclaw?.profile ? `Perfil ${config.openclaw.profile}` : ""}</div>
              </div>
              <div className="rounded-[8px] border border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">Proveedor</div>
                <div className="mt-1 font-medium text-neutral-900">{activeProvider.label}</div>
                <div className="mt-1 text-xs text-neutral-500">{installation.provider === "openrouter" ? `openrouter/${installation.modelId}` : `${installation.provider}/${installation.modelId}`}</div>
              </div>
              <div className="rounded-[8px] border border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">Agente inicial</div>
                <div className="mt-1 font-medium text-neutral-900">{installation.firstAgentName}</div>
                <div className="mt-1 text-xs text-neutral-500">{installation.firstAgentId} · {installation.firstAgentRole}</div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </section>
  );
}


