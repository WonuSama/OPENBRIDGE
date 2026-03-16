import { NextResponse } from "next/server";
import { getOpenClawProfile, openclawProfileCommand, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const profile = getOpenClawProfile();
    const command = [
      "set -e",
      "openclaw update --yes --no-restart",
      "openclaw doctor 2>/dev/null | sed -n '1,80p' || true",
      `${openclawProfileCommand("gateway restart")} >/dev/null 2>&1 || true`,
      `${openclawProfileCommand(`channels status --probe`)} 2>/dev/null | sed -n '1,80p' || true`,
      `printf '\\nPROFILE=%s\\n' ${shellEscape(profile)}`,
    ].join("; ");

    const result = await runRemote(command);
    if (result.code && result.code !== 0) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || "No pude actualizar OpenClaw");
    }

    return NextResponse.json({
      ok: true,
      output: result.stdout.trim(),
      stderr: result.stderr.trim(),
      profile,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
