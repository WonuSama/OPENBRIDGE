import { NextResponse } from "next/server";
import { runRemote } from "@/lib/remote";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cmd = [
      "set -e",
      "read cpu user nice system idle iowait irq softirq steal guest guest_nice < /proc/stat",
      "cpu_total_1=$((user+nice+system+idle+iowait+irq+softirq+steal))",
      "cpu_idle_1=$((idle+iowait))",
      "iface=$(awk -F: 'NR > 2 && $1 !~ /lo/ {gsub(/ /, \"\", $1); print $1; exit}' /proc/net/dev)",
      "rx_1=0",
      "tx_1=0",
      "if [ -n \"$iface\" ]; then set -- $(awk -F'[ :]+' -v iface=\"$iface\" '$1 == iface {print $2, $10}' /proc/net/dev); rx_1=$1; tx_1=$2; fi",
      "sleep 1",
      "read cpu2 user2 nice2 system2 idle2 iowait2 irq2 softirq2 steal2 guest2 guest_nice2 < /proc/stat",
      "cpu_total_2=$((user2+nice2+system2+idle2+iowait2+irq2+softirq2+steal2))",
      "cpu_idle_2=$((idle2+iowait2))",
      "cpu_usage=$(awk -v total1=\"$cpu_total_1\" -v total2=\"$cpu_total_2\" -v idle1=\"$cpu_idle_1\" -v idle2=\"$cpu_idle_2\" 'BEGIN { total=total2-total1; idle=idle2-idle1; if (total <= 0) print 0; else printf \"%.1f\", ((total-idle)/total)*100 }')",
      "rx_2=0",
      "tx_2=0",
      "if [ -n \"$iface\" ]; then set -- $(awk -F'[ :]+' -v iface=\"$iface\" '$1 == iface {print $2, $10}' /proc/net/dev); rx_2=$1; tx_2=$2; fi",
      "rx_rate=$((rx_2-rx_1))",
      "tx_rate=$((tx_2-tx_1))",
      "echo \"iface=$iface\"",
      "echo \"cpu=$(nproc)|$cpu_usage|$(cut -d ' ' -f1 /proc/loadavg)\"",
      "echo \"mem=$(free -b | awk '/Mem:/{print $2\"|\"$3}')\"",
      "echo \"net=$rx_rate|$tx_rate|$(ss -Htan state established 2>/dev/null | wc -l)\"",
      "echo \"uptime=$(uptime -p 2>/dev/null || true)\"",
    ].join("; ");

    const { stdout } = await runRemote(cmd);
    const lines = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const stats = { cpu: {}, mem: {}, network: {}, connection: {}, sampledAt: Date.now() };

    for (const line of lines) {
      if (line.startsWith("iface=")) stats.network.iface = line.slice(5) || null;
      if (line.startsWith("cpu=")) {
        const [cores, usagePercent, load] = line.slice(4).split("|");
        stats.cpu = { cores: Number(cores || 0), usagePercent: Number(usagePercent || 0), load: Number(load || 0) };
      }
      if (line.startsWith("mem=")) {
        const [total, used] = line.slice(4).split("|");
        const totalNum = Number(total || 0);
        const usedNum = Number(used || 0);
        stats.mem = {
          total: totalNum,
          used: usedNum,
          percent: totalNum ? Number(((usedNum / totalNum) * 100).toFixed(1)) : 0,
        };
      }
      if (line.startsWith("net=")) {
        const [rxBps, txBps, established] = line.slice(4).split("|");
        stats.network.rxBps = Number(rxBps || 0);
        stats.network.txBps = Number(txBps || 0);
        stats.connection.established = Number(established || 0);
      }
      if (line.startsWith("uptime=")) stats.connection.uptime = line.slice(7);
    }

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}