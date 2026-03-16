import { ShieldCheck, SquareTerminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DiagnosticsTab({ health, diagnostics, statusLabel }) {
  return (
    <section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card>
          <CardHeader className="border-b border-neutral-200 px-5 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-[1.05rem]">Salida del gateway</CardTitle>
                <CardDescription>Respuesta directa del ultimo chequeo ejecutado sobre el VPS.</CardDescription>
              </div>
              <Badge variant={health.ok ? "green" : health.loading ? "amber" : "pink"}>{statusLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5">
            <pre className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-950 px-4 py-4 font-mono text-[13px] leading-6 text-neutral-100">{health.output || "Todavia no hay diagnosticos cargados."}</pre>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b border-neutral-200 px-5 pb-4"><CardTitle className="text-[1.05rem]">Chequeos</CardTitle><CardDescription>Resumen legible de la ultima comprobacion.</CardDescription></CardHeader>
            <CardContent className="space-y-3 px-5">
              <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3"><div className="flex items-center gap-2 text-sm font-medium text-neutral-900"><ShieldCheck size={15} className={health.ok ? "text-emerald-600" : "text-amber-600"} />Estado del servicio</div><p className="mt-1 text-sm text-neutral-500">{health.ok ? "El gateway responde correctamente." : "Conviene revisar la salida del servicio."}</p></div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3"><div className="flex items-center gap-2 text-sm font-medium text-neutral-900"><SquareTerminal size={15} className="text-neutral-700" />Lineas analizadas</div><p className="mt-1 text-sm text-neutral-500">{diagnostics.length} lineas detectadas en la ultima respuesta.</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-neutral-200 px-5 pb-4"><CardTitle className="text-[1.05rem]">Senales recientes</CardTitle><CardDescription>Fragmentos utiles del diagnostico actual.</CardDescription></CardHeader>
            <CardContent className="space-y-2 px-5">
              {diagnostics.length ? diagnostics.map((line, index) => <div key={`${line}-${index}`} className="rounded-md border border-neutral-200 px-3 py-3 text-sm text-neutral-700">{line}</div>) : <p className="text-sm text-neutral-500">Todavia no hay senales para mostrar.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
