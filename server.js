require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = Number(process.env.DASHBOARD_PORT || 5070);
const WORKSPACE_ROOT = process.env.OPENCLAW_WORKSPACE_ROOT || '/root/.openclaw-nuevo/workspace';
const STATE_ROOT = process.env.OPENCLAW_STATE_ROOT || '/root/.openclaw-nuevo';
const OPENCLAW_PROFILE = process.env.OPENCLAW_PROFILE || 'nuevo';

function getSshConfig() {
  const host = process.env.VPS_HOST;
  const username = process.env.VPS_USER;
  const port = Number(process.env.VPS_PORT || 22);

  if (!host || !username) {
    throw new Error('Faltan VPS_HOST o VPS_USER en .env');
  }

  const cfg = {
    host,
    username,
    port,
    readyTimeout: 15000,
  };

  if (process.env.VPS_PASSWORD) {
    cfg.password = process.env.VPS_PASSWORD;
  } else if (process.env.VPS_PRIVATE_KEY_PATH) {
    cfg.privateKey = fs.readFileSync(process.env.VPS_PRIVATE_KEY_PATH, 'utf8');
    if (process.env.VPS_PRIVATE_KEY_PASSPHRASE) {
      cfg.passphrase = process.env.VPS_PRIVATE_KEY_PASSPHRASE;
    }
  } else {
    throw new Error('Falta VPS_PASSWORD o VPS_PRIVATE_KEY_PATH en .env');
  }

  return cfg;
}

function runRemote(command) {
  const sshConfig = getSshConfig();
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn
      .on('ready', () => {
        conn.exec(command, { pty: false }, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          stream.on('close', (code) => {
            conn.end();
            resolve({ code, stdout, stderr });
          });
          stream.on('data', (chunk) => {
            stdout += chunk.toString('utf8');
          });
          stream.stderr.on('data', (chunk) => {
            stderr += chunk.toString('utf8');
          });
        });
      })
      .on('error', reject)
      .connect(sshConfig);
  });
}

function shellEscape(str) {
  return `'${String(str).replace(/'/g, `'"'"'`)}'`;
}

function normalizeRelative(input) {
  const rel = (input || '.').replace(/\\/g, '/').trim();
  const normalized = path.posix.normalize(rel);
  if (path.posix.isAbsolute(normalized) || normalized.startsWith('..')) {
    throw new Error('Ruta invalida');
  }
  return normalized === '.' ? '' : normalized;
}

function resolveRoot(scope) {
  return scope === 'state' ? STATE_ROOT : WORKSPACE_ROOT;
}

function fullRemotePath(relativePath, scope) {
  const root = resolveRoot(scope);
  return relativePath ? path.posix.join(root, relativePath) : root;
}

function parseListing(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kind, name, sizeStr, mtimeStr] = line.split('|');
      return {
        kind,
        name,
        size: Number(sizeStr || 0),
        mtimeEpoch: Number(mtimeStr || 0),
      };
    });
}

app.get('/api/health', async (_req, res) => {
  try {
    const cmd = [
      'set -e',
      `systemctl --user is-active openclaw-gateway-${OPENCLAW_PROFILE}.service || true`,
      `openclaw --profile ${shellEscape(OPENCLAW_PROFILE)} channels status --probe 2>/dev/null | sed -n "1,80p" || true`,
    ].join('; ');

    const result = await runRemote(cmd);
    res.json({ ok: true, output: result.stdout.trim(), stderr: result.stderr.trim() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/workspace/tree', async (req, res) => {
  try {
    const scope = req.query.scope === 'state' ? 'state' : 'workspace';
    const relative = normalizeRelative(req.query.path);
    const dir = fullRemotePath(relative, scope);

    const cmd = [
      'set -e',
      `DIR=${shellEscape(dir)}`,
      '[ -d "$DIR" ] || { echo "__ERR__NOT_DIR"; exit 0; }',
      'find "$DIR" -mindepth 1 -maxdepth 1 -printf "%y|%f|%s|%T@\\n" | sort',
    ].join('; ');

    const result = await runRemote(cmd);
    if (result.stdout.includes('__ERR__NOT_DIR')) {
      return res.status(400).json({ error: 'No es un directorio valido.' });
    }

    const items = parseListing(result.stdout).map((x) => ({
      ...x,
      path: relative ? `${relative}/${x.name}` : x.name,
      type: x.kind === 'd' ? 'directory' : x.kind === 'f' ? 'file' : 'other',
    }));

    return res.json({
      scope,
      currentPath: relative,
      parentPath: relative ? path.posix.dirname(relative) === '.' ? '' : path.posix.dirname(relative) : null,
      items,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/workspace/stats', async (_req, res) => {
  try {
    const scope = _req.query.scope === 'state' ? 'state' : 'workspace';
    const root = shellEscape(resolveRoot(scope));
    const cmd = [
      'set -e',
      `ROOT=${root}`,
      'echo "total_files=$(find \"$ROOT\" -type f 2>/dev/null | wc -l)"',
      'echo "total_dirs=$(find \"$ROOT\" -type d 2>/dev/null | wc -l)"',
      'echo "total_size=$(du -sb \"$ROOT\" 2>/dev/null | awk \"{print $1}\")"',
      'echo "largest_start"',
      'find "$ROOT" -type f -printf "%s|%P\\n" 2>/dev/null | sort -nr | head -n 8',
      'echo "largest_end"',
      'echo "recent_start"',
      'find "$ROOT" -type f -printf "%T@|%P\\n" 2>/dev/null | sort -nr | head -n 8',
      'echo "recent_end"',
    ].join('; ');

    const { stdout } = await runRemote(cmd);
    const lines = stdout.split('\n').map((x) => x.trim()).filter(Boolean);

    const stats = { totalFiles: 0, totalDirs: 0, totalSize: 0, largest: [], recent: [] };
    let section = null;

    for (const line of lines) {
      if (line === 'largest_start') {
        section = 'largest';
        continue;
      }
      if (line === 'largest_end') {
        section = null;
        continue;
      }
      if (line === 'recent_start') {
        section = 'recent';
        continue;
      }
      if (line === 'recent_end') {
        section = null;
        continue;
      }

      if (!section) {
        if (line.startsWith('total_files=')) stats.totalFiles = Number(line.split('=')[1]);
        if (line.startsWith('total_dirs=')) stats.totalDirs = Number(line.split('=')[1]);
        if (line.startsWith('total_size=')) stats.totalSize = Number(line.split('=')[1]);
        continue;
      }

      const [num, filePath] = line.split('|');
      if (!filePath) continue;
      if (section === 'largest') {
        stats.largest.push({ size: Number(num), path: filePath });
      } else {
        stats.recent.push({ mtimeEpoch: Number(num), path: filePath });
      }
    }

    res.json({ ...stats, scope });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workspace/file', async (req, res) => {
  try {
    const scope = req.query.scope === 'state' ? 'state' : 'workspace';
    const relative = normalizeRelative(req.query.path);
    if (!relative) return res.status(400).json({ error: 'Falta path de archivo.' });

    const filePath = fullRemotePath(relative, scope);
    const cmd = [
      'set -e',
      `FILE=${shellEscape(filePath)}`,
      '[ -f "$FILE" ] || { echo "__ERR__NOT_FILE"; exit 0; }',
      'MIME=$(file -b --mime-type "$FILE" 2>/dev/null || echo application/octet-stream)',
      'SIZE=$(stat -c%s "$FILE" 2>/dev/null || echo 0)',
      'echo "__META__${MIME}|${SIZE}"',
      'head -c 200000 "$FILE" | base64 -w0',
    ].join('; ');

    const { stdout } = await runRemote(cmd);
    if (stdout.includes('__ERR__NOT_FILE')) {
      return res.status(400).json({ error: 'No es un archivo valido.' });
    }

    const lines = stdout.split('\n');
    const metaLine = lines.find((x) => x.startsWith('__META__')) || '__META__application/octet-stream|0';
    const [, meta] = metaLine.split('__META__');
    const [mimeType, sizeStr] = meta.split('|');
    const base64 = lines.filter((x) => x && !x.startsWith('__META__')).join('');

    const isText = /^text\//.test(mimeType) || /json|xml|javascript|x-sh|yaml/.test(mimeType);
    const content = isText ? Buffer.from(base64 || '', 'base64').toString('utf8') : '';

    return res.json({
      scope,
      path: relative,
      mimeType,
      size: Number(sizeStr || 0),
      isText,
      content,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/workspace/file', async (req, res) => {
  try {
    const scope = req.body.scope === 'state' ? 'state' : 'workspace';
    const relative = normalizeRelative(req.body.path);
    const content = String(req.body.content || '');
    if (!relative) return res.status(400).json({ error: 'Falta path de archivo.' });

    const filePath = fullRemotePath(relative, scope);
    const dirPath = path.posix.dirname(filePath);
    const payload = Buffer.from(content, 'utf8').toString('base64');

    const cmd = [
      'set -e',
      `DIR=${shellEscape(dirPath)}`,
      `FILE=${shellEscape(filePath)}`,
      'mkdir -p "$DIR"',
      `printf %s ${shellEscape(payload)} | base64 -d > "$FILE"`,
      'stat -c "%n|%s|%Y" "$FILE"',
    ].join('; ');

    const { stdout } = await runRemote(cmd);
    const [name, size, epoch] = (stdout.trim().split('\n').pop() || '').split('|');

    return res.json({ ok: true, file: name, size: Number(size || 0), mtimeEpoch: Number(epoch || 0) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard listo en http://localhost:${PORT}`);
});
