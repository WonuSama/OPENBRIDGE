import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const CONFIG_PATH = path.join(DATA_DIR, "app-config.json");

function defaultConfig() {
  const profile = process.env.OPENCLAW_PROFILE || "nuevo";
  const stateRoot = process.env.OPENCLAW_STATE_ROOT || `/root/.openclaw-${profile}`;
  const workspaceRoot = process.env.OPENCLAW_WORKSPACE_ROOT || `${stateRoot}/workspace`;

  return {
    onboardingCompleted: false,
    vps: {
      host: process.env.VPS_HOST || "",
      port: Number(process.env.VPS_PORT || 22),
      username: process.env.VPS_USER || "",
      password: process.env.VPS_PASSWORD || "",
      privateKeyPath: process.env.VPS_PRIVATE_KEY_PATH || "",
      privateKeyPassphrase: process.env.VPS_PRIVATE_KEY_PASSPHRASE || "",
    },
    openclaw: {
      binaryPath: process.env.OPENCLAW_BINARY_PATH || "openclaw",
      profile,
      stateRoot,
      workspaceRoot,
      installMode: "existing",
      firstAgentId: "main",
      firstAgentName: "Agente 01",
      firstAgentRole: "Asistente principal",
      firstAgentModel: process.env.OPENCLAW_DEFAULT_MODEL || "openrouter/google/gemini-2.5-pro",
      provider: process.env.OPENCLAW_DEFAULT_PROVIDER || "openrouter",
      modelId: process.env.OPENCLAW_DEFAULT_MODEL_ID || "google/gemini-2.5-pro",
      apiKey: process.env.OPENROUTER_API_KEY || "",
      baseUrl: process.env.OPENCLAW_BASE_URL || "",
    },
  };
}

function mergeConfig(base, patch = {}) {
  return {
    ...base,
    ...patch,
    vps: {
      ...base.vps,
      ...(patch.vps || {}),
    },
    openclaw: {
      ...base.openclaw,
      ...(patch.openclaw || {}),
    },
  };
}

export function readAppConfig() {
  const defaults = defaultConfig();
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return mergeConfig(defaults, JSON.parse(raw));
  } catch {
    return defaults;
  }
}

export function writeAppConfig(nextConfig) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(nextConfig, null, 2), "utf8");
  return nextConfig;
}

export function updateAppConfig(patch) {
  const current = readAppConfig();
  const next = mergeConfig(current, patch);
  return writeAppConfig(next);
}

export function sanitizeAppConfig(config) {
  return {
    onboardingCompleted: !!config.onboardingCompleted,
    vps: {
      host: config.vps?.host || "",
      port: Number(config.vps?.port || 22),
      username: config.vps?.username || "",
      passwordSet: Boolean(config.vps?.password),
      privateKeyPath: config.vps?.privateKeyPath || "",
      privateKeyPassphraseSet: Boolean(config.vps?.privateKeyPassphrase),
    },
    openclaw: {
      binaryPath: config.openclaw?.binaryPath || "openclaw",
      profile: config.openclaw?.profile || "nuevo",
      stateRoot: config.openclaw?.stateRoot || "",
      workspaceRoot: config.openclaw?.workspaceRoot || "",
      installMode: config.openclaw?.installMode || "existing",
      firstAgentId: config.openclaw?.firstAgentId || "main",
      firstAgentName: config.openclaw?.firstAgentName || "Agente 01",
      firstAgentRole: config.openclaw?.firstAgentRole || "Asistente principal",
      firstAgentModel: config.openclaw?.firstAgentModel || "",
      provider: config.openclaw?.provider || "openrouter",
      modelId: config.openclaw?.modelId || "",
      apiKeySet: Boolean(config.openclaw?.apiKey),
      baseUrl: config.openclaw?.baseUrl || "",
    },
  };
}
