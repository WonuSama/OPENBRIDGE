import path from "path";
import { NextResponse } from "next/server";
import { fullRemotePath, normalizeRelative, parseListing, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "state" ? "state" : "workspace";
    const relative = normalizeRelative(searchParams.get("path") || "");
    const dir = fullRemotePath(relative, scope);

    const cmd = [
      "set -e",
      `DIR=${shellEscape(dir)}`,
      '[ -d "$DIR" ] || { echo "__ERR__NOT_DIR"; exit 0; }',
      'find "$DIR" -mindepth 1 -maxdepth 1 -printf "%y|%f|%s|%T@\\n" | sort',
    ].join("; ");

    const result = await runRemote(cmd);
    if (result.stdout.includes("__ERR__NOT_DIR")) {
      return NextResponse.json({ error: "No es un directorio valido." }, { status: 400 });
    }

    const items = parseListing(result.stdout).map((x) => ({
      ...x,
      path: relative ? `${relative}/${x.name}` : x.name,
      type: x.kind === "d" ? "directory" : x.kind === "f" ? "file" : "other",
    }));

    return NextResponse.json({
      scope,
      currentPath: relative,
      parentPath: relative ? (path.posix.dirname(relative) === "." ? "" : path.posix.dirname(relative)) : null,
      items,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
