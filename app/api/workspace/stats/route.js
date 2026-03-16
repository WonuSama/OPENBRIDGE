import { NextResponse } from "next/server";
import { resolveRoot, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "state" ? "state" : "workspace";
    const root = shellEscape(resolveRoot(scope));

    const cmd = [
      "set -e",
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
    ].join("; ");

    const { stdout } = await runRemote(cmd);
    const lines = stdout.split("\n").map((x) => x.trim()).filter(Boolean);
    const stats = { totalFiles: 0, totalDirs: 0, totalSize: 0, largest: [], recent: [], scope };
    let section = null;

    for (const line of lines) {
      if (line === "largest_start") {
        section = "largest";
        continue;
      }
      if (line === "largest_end") {
        section = null;
        continue;
      }
      if (line === "recent_start") {
        section = "recent";
        continue;
      }
      if (line === "recent_end") {
        section = null;
        continue;
      }

      if (!section) {
        if (line.startsWith("total_files=")) stats.totalFiles = Number(line.split("=")[1]);
        if (line.startsWith("total_dirs=")) stats.totalDirs = Number(line.split("=")[1]);
        if (line.startsWith("total_size=")) stats.totalSize = Number(line.split("=")[1]);
        continue;
      }

      const [num, filePath] = line.split("|");
      if (!filePath) continue;
      if (section === "largest") {
        stats.largest.push({ size: Number(num), path: filePath });
      } else {
        stats.recent.push({ mtimeEpoch: Number(num), path: filePath });
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
