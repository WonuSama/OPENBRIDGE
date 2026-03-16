import { NextResponse } from "next/server";
import { getOpenClawProfile, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = getOpenClawProfile();
    const cmd = [
      "set -e",
      `systemctl --user is-active openclaw-gateway-${profile}.service || true`,
      `openclaw --profile ${shellEscape(profile)} channels status --probe 2>/dev/null | sed -n \"1,80p\" || true`,
    ].join("; ");

    const result = await runRemote(cmd);
    return NextResponse.json({ ok: true, output: result.stdout.trim(), stderr: result.stderr.trim() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
