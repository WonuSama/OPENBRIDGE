import fs from "fs";
import path from "path";
import { Client } from "ssh2";
import { readAppConfig } from "@/lib/app-config";

const REMOTE_TIMEOUT_MS = Number(process.env.REMOTE_TIMEOUT_MS || 20000);

function getRuntimeConfig(overrides = {}) {
  const current = readAppConfig();
  return {
    ...current,
    ...overrides,
    vps: {
      ...current.vps,
      ...(overrides.vps || {}),
    },
    openclaw: {
      ...current.openclaw,
      ...(overrides.openclaw || {}),
    },
  };
}

function getRemoteEnvFile(runtime) {
  const stateRoot = runtime.openclaw?.stateRoot;
  if (!stateRoot) return "";
  return path.posix.join(stateRoot, "dashboard-provider.env");
}

function buildRemoteEnvPrelude(runtime) {
  const envFile = getRemoteEnvFile(runtime);
  if (!envFile) return "";
  return `set -a; if [ -f ${shellEscape(envFile)} ]; then . ${shellEscape(envFile)}; fi; set +a;`;
}

export function getOpenClawProfile() {
  return getRuntimeConfig().openclaw.profile;
}

export function getWorkspaceRoot() {
  return getRuntimeConfig().openclaw.workspaceRoot;
}

export function getStateRoot() {
  return getRuntimeConfig().openclaw.stateRoot;
}

export function openclawProfileCommand(args = "") {
  const runtime = getRuntimeConfig();
  const suffix = String(args || "").trim();
  return `${shellEscape(runtime.openclaw.binaryPath || "openclaw")} --profile ${shellEscape(runtime.openclaw.profile || "nuevo")}${suffix ? ` ${suffix}` : ""}`;
}

export function resolveRoot(scope) {
  const runtime = getRuntimeConfig();
  return scope === "state" ? runtime.openclaw.stateRoot : runtime.openclaw.workspaceRoot;
}

export function normalizeRelative(input) {
  const rel = (input || ".").replace(/\\/g, "/").trim();
  const normalized = path.posix.normalize(rel);
  if (path.posix.isAbsolute(normalized) || normalized.startsWith("..")) {
    throw new Error("Ruta invalida");
  }
  return normalized === "." ? "" : normalized;
}

export function shellEscape(str) {
  return `'${String(str).replace(/'/g, `'"'"'`)}'`;
}

export function fullRemotePath(relativePath, scope) {
  const root = resolveRoot(scope);
  return relativePath ? path.posix.join(root, relativePath) : root;
}

function buildSshConfig(runtime) {
  const host = runtime.vps?.host;
  const username = runtime.vps?.username;
  const port = Number(runtime.vps?.port || 22);

  if (!host || !username) {
    throw new Error("Faltan host o usuario del VPS en configuración.");
  }

  const cfg = {
    host,
    username,
    port,
    readyTimeout: 15000,
  };

  if (runtime.vps?.password) {
    cfg.password = runtime.vps.password;
  } else if (runtime.vps?.privateKeyPath) {
    cfg.privateKey = fs.readFileSync(runtime.vps.privateKeyPath, "utf8");
    if (runtime.vps?.privateKeyPassphrase) {
      cfg.passphrase = runtime.vps.privateKeyPassphrase;
    }
  } else {
    throw new Error("Falta contraseña o clave privada del VPS en configuración.");
  }

  return cfg;
}

export function parseListing(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kind, name, sizeStr, mtimeStr] = line.split("|");
      return {
        kind,
        name,
        size: Number(sizeStr || 0),
        mtimeEpoch: Number(mtimeStr || 0),
      };
    });
}

export function runRemote(command, options = {}) {
  const timeoutMs = Number(options.timeoutMs || REMOTE_TIMEOUT_MS);
  const timeoutSeconds = Math.max(5, Math.ceil(timeoutMs / 1000));
  const runtime = getRuntimeConfig();
  const finalCommand = [buildRemoteEnvPrelude(runtime), command].filter(Boolean).join(" ");
  const wrappedCommand = `timeout -k 5s ${timeoutSeconds}s bash -lc ${shellEscape(finalCommand)}`;
  return runRemoteInternal(buildSshConfig(runtime), wrappedCommand, timeoutMs);
}

export function runRemoteWithConfig(command, runtimeOverrides = {}, options = {}) {
  const timeoutMs = Number(options.timeoutMs || REMOTE_TIMEOUT_MS);
  const timeoutSeconds = Math.max(5, Math.ceil(timeoutMs / 1000));
  const runtime = getRuntimeConfig(runtimeOverrides);
  const finalCommand = [buildRemoteEnvPrelude(runtime), command].filter(Boolean).join(" ");
  const wrappedCommand = `timeout -k 5s ${timeoutSeconds}s bash -lc ${shellEscape(finalCommand)}`;
  return runRemoteInternal(buildSshConfig(runtime), wrappedCommand, timeoutMs);
}

function runRemoteInternal(sshConfig, wrappedCommand, timeoutMs) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        conn.end();
      } catch {}
      reject(new Error(`Tiempo agotado al conectar con el VPS (${timeoutMs} ms)`));
    }, timeoutMs);

    function safeResolve(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }

    function safeReject(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    }

    conn
      .on("ready", () => {
        conn.exec(wrappedCommand, { pty: false }, (err, stream) => {
          if (err) {
            conn.end();
            safeReject(err);
            return;
          }

          stream.on("close", (code) => {
            conn.end();
            safeResolve({ code, stdout, stderr });
          });

          stream.on("data", (chunk) => {
            stdout += chunk.toString("utf8");
          });

          stream.stderr.on("data", (chunk) => {
            stderr += chunk.toString("utf8");
          });
        });
      })
      .on("error", safeReject)
      .connect(sshConfig);
  });
}
