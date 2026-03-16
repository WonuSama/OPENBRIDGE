import AddRounded from "@mui/icons-material/AddRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import RouteRounded from "@mui/icons-material/RouteRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function MultiagentsBuilderView({ presets, builder, setBuilder, defaultModel, creating, createAgent, pickPreset }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
      <Card>
        <CardHeader className="border-b border-neutral-200 px-5 pb-4">
          <CardTitle className="text-[1.05rem]">Configurar nuevo agente</CardTitle>
          <CardDescription>Usa un preset como base y ajusta nombre, función principal y modelo antes de crearlo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            {presets.map((preset) => (
              <button key={preset.id} type="button" onClick={() => pickPreset(preset)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-left transition-colors hover:bg-white">
                <div className="text-sm font-medium text-neutral-900">{preset.title}</div>
                <div className="mt-1 text-sm text-neutral-500">{preset.role}</div>
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><label className="block text-sm font-medium text-neutral-900">Id técnico</label><Input value={builder.id} onChange={(event) => setBuilder((current) => ({ ...current, id: event.target.value }))} placeholder="research" /></div>
            <div className="space-y-2"><label className="block text-sm font-medium text-neutral-900">Nombre visible</label><Input value={builder.name} onChange={(event) => setBuilder((current) => ({ ...current, name: event.target.value }))} placeholder="Research" /></div>
            <div className="space-y-2 md:col-span-2"><label className="block text-sm font-medium text-neutral-900">Función principal</label><Input value={builder.role} onChange={(event) => setBuilder((current) => ({ ...current, role: event.target.value }))} placeholder="Investigación y síntesis" /></div>
            <div className="space-y-2 md:col-span-2"><label className="block text-sm font-medium text-neutral-900">Modelo</label><Input value={builder.model} onChange={(event) => setBuilder((current) => ({ ...current, model: event.target.value }))} placeholder={defaultModel} /></div>
          </div>

          <div className="flex items-center justify-end">
            <Button onClick={createAgent} disabled={!builder.id || creating}>
              <AddRounded sx={{ fontSize: 16 }} />
              {creating ? "Creando..." : "Crear agente"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-neutral-200 px-5 pb-4">
          <CardTitle className="text-[1.05rem]">Qué se genera</CardTitle>
          <CardDescription>Preparación inicial basada en el perfil `nuevo`.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5 py-5">
          <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4">
            <Inventory2Rounded sx={{ fontSize: 18 }} className="mt-0.5 text-neutral-500" />
            <div>
              <div className="text-sm font-medium text-neutral-900">Workspace aislado</div>
              <div className="mt-1 text-sm text-neutral-500">Se crea bajo `.openclaw-nuevo/workspace-{builder.id || 'agent'}` para mantener separación limpia.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4">
            <SmartToyRounded sx={{ fontSize: 18 }} className="mt-0.5 text-neutral-500" />
            <div>
              <div className="text-sm font-medium text-neutral-900">Identidad inicial</div>
              <div className="mt-1 text-sm text-neutral-500">Se escribe un `IDENTITY.md` base con nombre y función principal para dejarlo listo desde el arranque.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4">
            <RouteRounded sx={{ fontSize: 18 }} className="mt-0.5 text-neutral-500" />
            <div>
              <div className="text-sm font-medium text-neutral-900">Modelo por defecto</div>
              <div className="mt-1 text-sm text-neutral-500">Sale precargado con el modelo actual del sistema: {defaultModel}.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
