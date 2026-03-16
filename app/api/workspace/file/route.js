import path from "path";
import { NextResponse } from "next/server";
import { fullRemotePath, normalizeRelative, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "state" ? "state" : "workspace";
    const relative = normalizeRelative(searchParams.get("path") || "");
    if (!relative) return NextResponse.json({ error: "Falta path de archivo." }, { status: 400 });

    const filePath = fullRemotePath(relative, scope);
    const cmd = [
      "set -e",
      `FILE=${shellEscape(filePath)}`,
      '[ -f "$FILE" ] || { echo "__ERR__NOT_FILE"; exit 0; }',
      'MIME=$(file -b --mime-type "$FILE" 2>/dev/null || echo application/octet-stream)',
      'SIZE=$(stat -c%s "$FILE" 2>/dev/null || echo 0)',
      'echo "__META__${MIME}|${SIZE}"',
      'head -c 200000 "$FILE" | base64 -w0',
    ].join("; ");

    const { stdout } = await runRemote(cmd);
    if (stdout.includes("__ERR__NOT_FILE")) {
      return NextResponse.json({ error: "No es un archivo valido." }, { status: 400 });
    }

    const lines = stdout.split("\n");
    const metaLine = lines.find((x) => x.startsWith("__META__")) || "__META__application/octet-stream|0";
    const [, meta] = metaLine.split("__META__");
    const [mimeType, sizeStr] = meta.split("|");
    const base64 = lines.filter((x) => x && !x.startsWith("__META__")).join("");

    const isText = /^text\//.test(mimeType) || /json|xml|javascript|x-sh|yaml/.test(mimeType);
    const content = isText ? Buffer.from(base64 || "", "base64").toString("utf8") : "";

    return NextResponse.json({
      scope,
      path: relative,
      mimeType,
      size: Number(sizeStr || 0),
      isText,
      content,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const scope = body.scope === "state" ? "state" : "workspace";
    const action = String(body.action || "save").trim();
    const relative = normalizeRelative(body.path || "");

    if (!relative) return NextResponse.json({ error: "Falta path de archivo." }, { status: 400 });

    if (action === "rename") {
      const nextName = String(body.newName || "").trim();
      if (!nextName || /[\\/]/.test(nextName)) {
        return NextResponse.json({ error: "El nuevo nombre no es valido." }, { status: 400 });
      }

      const targetPath = fullRemotePath(relative, scope);
      const parentDir = path.posix.dirname(targetPath);
      const nextPath = path.posix.join(parentDir, nextName);
      const nextRelative = normalizeRelative(path.posix.join(path.posix.dirname(relative), nextName));

      const cmd = [
        "set -e",
        `TARGET=${shellEscape(targetPath)}`,
        `NEXT=${shellEscape(nextPath)}`,
        '[ -e "$TARGET" ] || { echo "__ERR__NOT_FOUND"; exit 0; }',
        '[ ! -e "$NEXT" ] || { echo "__ERR__ALREADY_EXISTS"; exit 0; }',
        'mv "$TARGET" "$NEXT"',
        'echo "__OK__"',
      ].join("; ");

      const { stdout } = await runRemote(cmd);
      if (stdout.includes("__ERR__NOT_FOUND")) {
        return NextResponse.json({ error: "El archivo o directorio ya no existe." }, { status: 400 });
      }
      if (stdout.includes("__ERR__ALREADY_EXISTS")) {
        return NextResponse.json({ error: "Ya existe un elemento con ese nombre." }, { status: 400 });
      }

      return NextResponse.json({ ok: true, path: nextRelative, name: nextName });
    }

    if (action === "delete") {
      const confirmText = String(body.confirmText || "").trim();
      const expected = path.posix.basename(relative);
      if (confirmText !== expected) {
        return NextResponse.json({ error: `Escribe exactamente ${expected} para confirmar.` }, { status: 400 });
      }

      const targetPath = fullRemotePath(relative, scope);
      const cmd = [
        "set -e",
        `TARGET=${shellEscape(targetPath)}`,
        '[ -e "$TARGET" ] || { echo "__ERR__NOT_FOUND"; exit 0; }',
        'if [ -d "$TARGET" ]; then rm -rf "$TARGET"; else rm -f "$TARGET"; fi',
        'echo "__OK__"',
      ].join("; ");

      const { stdout } = await runRemote(cmd, { timeoutMs: 30000 });
      if (stdout.includes("__ERR__NOT_FOUND")) {
        return NextResponse.json({ error: "El archivo o directorio ya no existe." }, { status: 400 });
      }

      return NextResponse.json({ ok: true, deleted: relative });
    }

    const content = String(body.content || "");

    const filePath = fullRemotePath(relative, scope);
    const dirPath = path.posix.dirname(filePath);
    const payload = Buffer.from(content, "utf8").toString("base64");

    const cmd = [
      "set -e",
      `DIR=${shellEscape(dirPath)}`,
      `FILE=${shellEscape(filePath)}`,
      'mkdir -p "$DIR"',
      `printf %s ${shellEscape(payload)} | base64 -d > "$FILE"`,
      'stat -c "%n|%s|%Y" "$FILE"',
    ].join("; ");

    const { stdout } = await runRemote(cmd);
    const [name, size, epoch] = (stdout.trim().split("\n").pop() || "").split("|");

    return NextResponse.json({ ok: true, file: name, size: Number(size || 0), mtimeEpoch: Number(epoch || 0) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
