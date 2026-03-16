import { NextResponse } from "next/server";
import { readAppConfig, sanitizeAppConfig, updateAppConfig, writeAppConfig } from "@/lib/app-config";
import { runRemote, runRemoteWithConfig, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

function normalizeAgentId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function normalizeOpenRouterModel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith("openrouter/") ? raw : `openrouter/${raw.replace(/^\/+/, "")}`;
}

const PROVIDER_ENV_KEYS = {
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GEMINI_API_KEY",
  xai: "XAI_API_KEY",
};

function normalizeProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (["openrouter", "openai", "anthropic", "google", "xai", "ollama"].includes(provider)) return provider;
  return "openrouter";
}

function normalizeModelRef(provider, modelId) {
  const normalizedProvider = normalizeProvider(provider);
  const cleanModel = String(modelId || "").trim().replace(/^\/+/, "");
  if (!cleanModel) return "";
  if (cleanModel.startsWith(`${normalizedProvider}/`)) return cleanModel;
  return `${normalizedProvider}/${cleanModel}`;
}

function serializeProviderEnv(openclawConfig) {
  const lines = [];
  const provider = normalizeProvider(openclawConfig.provider);
  const apiKey = String(openclawConfig.apiKey || "").trim();
  const baseUrl = String(openclawConfig.baseUrl || "").trim();

  if (apiKey && PROVIDER_ENV_KEYS[provider]) {
    lines.push(`${PROVIDER_ENV_KEYS[provider]}=${apiKey}`);
  }
  if (baseUrl) {
    lines.push(`OPENAI_BASE_URL=${baseUrl}`);
  }
  return lines.join("\n");
}

async function writeProviderEnvFile(openclawConfig) {
  const envBody = serializeProviderEnv(openclawConfig);
  const envFile = `${openclawConfig.stateRoot}/dashboard-provider.env`;
  const envB64 = Buffer.from(envBody, "utf8").toString("base64");
  const cmd = [
    `mkdir -p ${shellEscape(openclawConfig.stateRoot)}`,
    envBody
      ? `printf %s ${shellEscape(envB64)} | base64 -d > ${shellEscape(envFile)}`
      : `rm -f ${shellEscape(envFile)}`,
    envBody ? `chmod 600 ${shellEscape(envFile)}` : "true",
  ].join(" && ");
  await runRemote(cmd, { timeoutMs: 20000 });
}

function mergeWithCurrent(configOverrides = {}) {
  const current = readAppConfig();
  return {
    ...current,
    ...configOverrides,
    vps: {
      ...current.vps,
      ...(configOverrides.vps || {}),
    },
    openclaw: {
      ...current.openclaw,
      ...(configOverrides.openclaw || {}),
    },
  };
}

function buildDefaultOpenClawConfig(current = {}) {
  const profile = current.profile || "nuevo";
  const stateRoot = current.stateRoot || `/root/.openclaw-${profile}`;
  const workspaceRoot = current.workspaceRoot || `${stateRoot}/workspace`;
  return {
    binaryPath: "openclaw",
    profile,
    stateRoot,
    workspaceRoot,
    installMode: "",
    provider: "openrouter",
    modelId: "google/gemini-2.5-pro",
    apiKey: "",
    baseUrl: "",
    firstAgentId: "main",
    firstAgentName: "Agente 01",
    firstAgentRole: "Asistente principal",
    firstAgentModel: "openrouter/google/gemini-2.5-pro",
  };
}

async function detectOpenClaw(configOverrides = {}) {
  const config = mergeWithCurrent(configOverrides);
  const binaryPath = config.openclaw.binaryPath || "openclaw";
  const profile = config.openclaw.profile || "nuevo";
  const stateRoot = config.openclaw.stateRoot || `/root/.openclaw-${profile}`;
  const workspaceRoot = config.openclaw.workspaceRoot || `${stateRoot}/workspace`;

  const cmd = [
    "set +e",
    `BIN=${shellEscape(binaryPath)}`,
    `PROFILE=${shellEscape(profile)}`,
    `STATE_ROOT=${shellEscape(stateRoot)}`,
    `WORKSPACE_ROOT=${shellEscape(workspaceRoot)}`,
    'if [ -x "$BIN" ]; then RESOLVED_BIN="$BIN"; else RESOLVED_BIN="$(command -v "$BIN" 2>/dev/null || true)"; fi',
    'echo "__BIN__${RESOLVED_BIN}"',
    'if [ -n "$RESOLVED_BIN" ]; then "$RESOLVED_BIN" --version 2>/dev/null | head -n 1 | sed "s/^/__VERSION__/"; fi',
    'echo "__STATE__$( [ -d "$STATE_ROOT" ] && echo 1 || echo 0 )"',
    'echo "__WORKSPACE__$( [ -d "$WORKSPACE_ROOT" ] && echo 1 || echo 0 )"',
    'if [ -n "$RESOLVED_BIN" ]; then "$RESOLVED_BIN" --profile "$PROFILE" agents list --json 2>/dev/null | tr -d "\\n" | sed "s/^/__AGENTS__/"; fi',
  ].join("; ");

  const result = configOverrides.vps ? await runRemoteWithConfig(cmd, configOverrides, { timeoutMs: 30000 }) : await runRemote(cmd, { timeoutMs: 30000 });
  const lines = result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  const detection = {
    reachable: true,
    binaryResolved: "",
    version: "",
    stateRootExists: false,
    workspaceRootExists: false,
    agentCount: 0,
  };

  for (const line of lines) {
    if (line.startsWith("__BIN__")) detection.binaryResolved = line.slice(7);
    if (line.startsWith("__VERSION__")) detection.version = line.slice(11);
    if (line.startsWith("__STATE__")) detection.stateRootExists = line.slice(9) === "1";
    if (line.startsWith("__WORKSPACE__")) detection.workspaceRootExists = line.slice(13) === "1";
    if (line.startsWith("__AGENTS__")) {
      try {
        const parsed = JSON.parse(line.slice(10) || "[]");
        detection.agentCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch {}
    }
  }

  return detection;
}

async function createInitialAgent({ binaryPath, profile, stateRoot, firstAgentId, firstAgentName, firstAgentRole, firstAgentModel }) {
  const workspace = `${stateRoot}/workspace-${firstAgentId}`;
  const identity = `# IDENTITY.md - Who Am I?\n\n- **Name:** ${firstAgentName}\n- **Creature:** ${firstAgentRole}\n- **Vibe:** Calm, capable and focused\n- **Emoji:** ðŸ§ \n- **Avatar:**\n`;
  const identityB64 = Buffer.from(identity, "utf8").toString("base64");

  const createCmdParts = [
    `BIN=${shellEscape(binaryPath)}`,
    `PROFILE=${shellEscape(profile)}`,
    `STATE_ROOT=${shellEscape(stateRoot)}`,
    `WORKSPACE=${shellEscape(workspace)}`,
    `AGENT_ID=${shellEscape(firstAgentId)}`,
    `AGENT_MODEL=${shellEscape(firstAgentModel)}`,
    'if [ -x "$BIN" ]; then RESOLVED_BIN="$BIN"; else RESOLVED_BIN="$(command -v "$BIN")"; fi',
    'mkdir -p "$WORKSPACE" "$STATE_ROOT"',
    '"$RESOLVED_BIN" --profile "$PROFILE" agents add "$AGENT_ID" --workspace "$WORKSPACE" --non-interactive --json --model "$AGENT_MODEL" >/dev/null 2>&1 || true',
    `printf %s ${shellEscape(identityB64)} | base64 -d > ${shellEscape(`${workspace}/IDENTITY.md`)}`,
    '"$RESOLVED_BIN" --profile "$PROFILE" agents set-identity --agent "$AGENT_ID" --workspace "$WORKSPACE" --from-identity --json >/dev/null 2>&1 || true',
  ];

  await runRemote(createCmdParts.join("; "), { timeoutMs: 120000 });
}

export async function GET() {
  try {
    const config = readAppConfig();
    let detection = null;
    try {
      if (config.vps.host && config.vps.username) detection = await detectOpenClaw();
    } catch (error) {
      detection = { reachable: false, error: error.message };
    }
    return NextResponse.json({ config: sanitizeAppConfig(config), detection });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = String(body.action || "").trim();

    if (action === "save-connection") {
      const current = readAppConfig();
      const nextVps = {
        host: String(body.vps?.host || "").trim(),
        port: Number(body.vps?.port || 22),
        username: String(body.vps?.username || "").trim(),
        password: String(body.vps?.password || "").trim() || current.vps.password || "",
        privateKeyPath: String(body.vps?.privateKeyPath || "").trim() || current.vps.privateKeyPath || "",
        privateKeyPassphrase: String(body.vps?.privateKeyPassphrase || "").trim() || current.vps.privateKeyPassphrase || "",
      };
      await runRemoteWithConfig("echo connected", { vps: nextVps }, { timeoutMs: 15000 });
      const config = updateAppConfig({ vps: nextVps });
      return NextResponse.json({ ok: true, config: sanitizeAppConfig(config) });
    }

    if (action === "clear-connection") {
      const current = readAppConfig();
      const expected = String(body.confirmText || "").trim();
      if (!current.vps.host) {
        return NextResponse.json({ error: "No hay una conexion VPS configurada." }, { status: 400 });
      }
      if (expected !== current.vps.host) {
        return NextResponse.json({ error: `Escribe exactamente ${current.vps.host} para confirmar.` }, { status: 400 });
      }
      const config = updateAppConfig({
        onboardingCompleted: false,
        vps: {
          host: "",
          port: 22,
          username: "",
          password: "",
          privateKeyPath: "",
          privateKeyPassphrase: "",
        },
      });
      return NextResponse.json({ ok: true, config: sanitizeAppConfig(config) });
    }

    if (action === "use-existing") {
      const openclaw = {
        binaryPath: String(body.openclaw?.binaryPath || "openclaw").trim() || "openclaw",
        profile: String(body.openclaw?.profile || "nuevo").trim() || "nuevo",
        stateRoot: String(body.openclaw?.stateRoot || "").trim(),
        workspaceRoot: String(body.openclaw?.workspaceRoot || "").trim(),
        installMode: "existing",
        provider: normalizeProvider(body.openclaw?.provider || readAppConfig().openclaw.provider || "openrouter"),
        modelId: String(body.openclaw?.modelId || readAppConfig().openclaw.modelId || "").trim(),
        baseUrl: String(body.openclaw?.baseUrl || "").trim(),
        apiKey: String(body.openclaw?.apiKey || "").trim() || readAppConfig().openclaw.apiKey || "",
      };
      updateAppConfig({ openclaw: { ...openclaw, firstAgentModel: normalizeModelRef(openclaw.provider, openclaw.modelId) || readAppConfig().openclaw.firstAgentModel } });
      await writeProviderEnvFile(readAppConfig().openclaw);
      const detection = await detectOpenClaw();
      const config = detection.binaryResolved
        ? updateAppConfig({
            openclaw: {
              ...readAppConfig().openclaw,
              binaryPath: detection.binaryResolved,
            },
          })
        : readAppConfig();
      return NextResponse.json({ ok: true, config: sanitizeAppConfig(config), detection });
    }


    if (action === "update-installation") {
      const current = readAppConfig();
      const nextOpenclaw = {
        ...current.openclaw,
        binaryPath: String(body.openclaw?.binaryPath || current.openclaw.binaryPath || "openclaw").trim() || "openclaw",
        profile: String(body.openclaw?.profile || current.openclaw.profile || "nuevo").trim() || "nuevo",
        stateRoot: String(body.openclaw?.stateRoot || current.openclaw.stateRoot || "").trim(),
        workspaceRoot: String(body.openclaw?.workspaceRoot || current.openclaw.workspaceRoot || "").trim(),
        installMode: String(body.openclaw?.installMode || current.openclaw.installMode || "existing").trim() || "existing",
        provider: normalizeProvider(body.openclaw?.provider || current.openclaw.provider || "openrouter"),
        modelId: String(body.openclaw?.modelId || current.openclaw.modelId || "").trim(),
        apiKey: String(body.openclaw?.apiKey || "").trim() || current.openclaw.apiKey || "",
        baseUrl: String(body.openclaw?.baseUrl || current.openclaw.baseUrl || "").trim(),
        firstAgentId: String(body.openclaw?.firstAgentId || current.openclaw.firstAgentId || "main").trim() || "main",
        firstAgentName: String(body.openclaw?.firstAgentName || current.openclaw.firstAgentName || "Agente 01").trim() || "Agente 01",
        firstAgentRole: String(body.openclaw?.firstAgentRole || current.openclaw.firstAgentRole || "Asistente principal").trim() || "Asistente principal",
      };

      nextOpenclaw.firstAgentModel =
        normalizeModelRef(nextOpenclaw.provider, nextOpenclaw.modelId) ||
        current.openclaw.firstAgentModel ||
        "openrouter/google/gemini-2.5-pro";

      updateAppConfig({ openclaw: nextOpenclaw });
      await writeProviderEnvFile(readAppConfig().openclaw);
      const detection = await detectOpenClaw();
      const config = detection.binaryResolved
        ? updateAppConfig({
            openclaw: {
              ...readAppConfig().openclaw,
              binaryPath: detection.binaryResolved,
            },
          })
        : readAppConfig();

      return NextResponse.json({ ok: true, config: sanitizeAppConfig(config), detection });
    }
    if (action === "install-openclaw") {
      const current = readAppConfig();
      const profile = String(body.openclaw?.profile || current.openclaw.profile || "nuevo").trim() || "nuevo";
      const stateRoot = String(body.openclaw?.stateRoot || `/root/.openclaw-${profile}`).trim();
      const workspaceRoot = String(body.openclaw?.workspaceRoot || `${stateRoot}/workspace`).trim();
      const binaryPath = String(body.openclaw?.binaryPath || "openclaw").trim() || "openclaw";
      const provider = normalizeProvider(body.openclaw?.provider || current.openclaw.provider || "openrouter");
      const modelId = String(body.openclaw?.modelId || current.openclaw.modelId || "").trim() || "google/gemini-2.5-pro";
      const apiKey = String(body.openclaw?.apiKey || "").trim();
      const baseUrl = String(body.openclaw?.baseUrl || "").trim();
      const firstAgentId = normalizeAgentId(body.openclaw?.firstAgentId || "main") || "main";
      const firstAgentName = String(body.openclaw?.firstAgentName || "Agente 01").trim() || "Agente 01";
      const firstAgentRole = String(body.openclaw?.firstAgentRole || "Asistente principal").trim() || "Asistente principal";
      const firstAgentModel = normalizeModelRef(provider, modelId) || normalizeOpenRouterModel(current.openclaw.firstAgentModel || "openrouter/google/gemini-2.5-pro");

      if (provider !== "ollama" && !apiKey) {
        return NextResponse.json({ error: "Falta la API key del proveedor elegido." }, { status: 400 });
      }

      updateAppConfig({
        openclaw: {
          binaryPath,
          profile,
          stateRoot,
          workspaceRoot,
          installMode: "install",
          provider,
          modelId,
          apiKey,
          baseUrl,
          firstAgentId,
          firstAgentName,
          firstAgentRole,
          firstAgentModel,
        },
      });

      const installCmd = [
        "set -e",
        "curl -fsSL https://openclaw.ai/install.sh | bash",
        `BIN=${shellEscape(binaryPath)}`,
        `STATE_ROOT=${shellEscape(stateRoot)}`,
        `WORKSPACE_ROOT=${shellEscape(workspaceRoot)}`,
        'if [ -x "$BIN" ]; then RESOLVED_BIN="$BIN"; else RESOLVED_BIN="$(command -v "$BIN")"; fi',
        'mkdir -p "$WORKSPACE_ROOT" "$STATE_ROOT"',
      ].join("; ");

      await runRemote(installCmd, { timeoutMs: 180000 });
      await writeProviderEnvFile(readAppConfig().openclaw);
      await createInitialAgent({ binaryPath, profile, stateRoot, firstAgentId, firstAgentName, firstAgentRole, firstAgentModel });
      const detection = await detectOpenClaw();
      const config = updateAppConfig({
        openclaw: {
          binaryPath: detection.binaryResolved || binaryPath,
          profile,
          stateRoot,
          workspaceRoot,
          installMode: "install",
          provider,
          modelId,
          apiKey,
          baseUrl,
          firstAgentId,
          firstAgentName,
          firstAgentRole,
          firstAgentModel,
        },
      });
      return NextResponse.json({ ok: true, config: sanitizeAppConfig(config), detection });
    }

    if (action === "remove-installation") {
      const current = readAppConfig();
      const expected = String(body.confirmText || "").trim();
      const installMode = String(current.openclaw.installMode || "");
      const stateRoot = current.openclaw.stateRoot;
      const workspaceRoot = current.openclaw.workspaceRoot;
      const profile = current.openclaw.profile || "nuevo";
      const requiredToken = `${profile}:${stateRoot}`;

      if (!stateRoot) {
        return NextResponse.json({ error: "No hay una instalacion configurada para eliminar." }, { status: 400 });
      }
      if (expected !== requiredToken) {
        return NextResponse.json({ error: `Escribe exactamente ${requiredToken} para confirmar.` }, { status: 400 });
      }

      if (current.vps.host && current.vps.username) {
        const cmd = [
          "set +e",
          `PROFILE=${shellEscape(profile)}`,
          `STATE_ROOT=${shellEscape(stateRoot)}`,
          `WORKSPACE_ROOT=${shellEscape(workspaceRoot)}`,
          `${shellEscape(current.openclaw.binaryPath || "openclaw")} --profile "$PROFILE" gateway stop >/dev/null 2>&1 || true`,
          `rm -f ${shellEscape(`${stateRoot}/dashboard-provider.env`)}`,
          installMode === "install" ? `rm -rf ${shellEscape(stateRoot)} ${shellEscape(workspaceRoot)}` : "true",
        ].join("; ");
        await runRemote(cmd, { timeoutMs: 60000 });
      }

      const config = updateAppConfig({
        onboardingCompleted: false,
        openclaw: buildDefaultOpenClawConfig(current.openclaw),
      });
      return NextResponse.json({ ok: true, config: sanitizeAppConfig(config) });
    }

    if (action === "complete-onboarding") {
      const config = updateAppConfig({ onboardingCompleted: true });
      return NextResponse.json({ ok: true, config: sanitizeAppConfig(config) });
    }

    if (action === "reset-onboarding") {
      const current = readAppConfig();
      current.onboardingCompleted = false;
      writeAppConfig(current);
      return NextResponse.json({ ok: true, config: sanitizeAppConfig(current) });
    }

    if (action === "detect") {
      const detection = await detectOpenClaw();
      return NextResponse.json({ ok: true, detection });
    }

    return NextResponse.json({ error: "Accion no soportada." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

