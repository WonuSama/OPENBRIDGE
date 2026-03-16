import CloseRounded from "@mui/icons-material/CloseRounded";
import RotateRightRounded from "@mui/icons-material/RotateRightRounded";
import ViewInArRounded from "@mui/icons-material/ViewInArRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import TextureRounded from "@mui/icons-material/TextureRounded";
import WeekendRounded from "@mui/icons-material/WeekendRounded";
import ParkRounded from "@mui/icons-material/ParkRounded";
import BorderAllRounded from "@mui/icons-material/BorderAllRounded";
import PrintRounded from "@mui/icons-material/PrintRounded";
import LocalDrinkRounded from "@mui/icons-material/LocalDrinkRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import CoffeeRounded from "@mui/icons-material/CoffeeRounded";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OfficeFurniturePreview, OfficeScene, getEditorTileSelection } from "@/components/dashboard/office-scene";
import {
  OFFICE_ITEM_LIBRARY,
  canPlaceLayoutItem,
  createLayoutItem,
  findItemAtTile,
  getItemFootprint,
  rotateLayoutItem,
  upsertFloorPatch,
} from "@/components/dashboard/office-layout";

const EDITOR_TOOLS = [
  { id: "select", label: "Seleccionar", icon: ViewInArRounded },
  { id: "floor-soft", label: "Floor soft", icon: TextureRounded },
  { id: "floor-warm", label: "Floor warm", icon: TextureRounded },
  { id: "floor-cool", label: "Floor cool", icon: TextureRounded },
  { id: "partition", label: "Partition", icon: BorderAllRounded },
  { id: "desk", label: "Desk", icon: ApartmentRounded },
  { id: "table", label: "Meeting", icon: GridViewRounded },
  { id: "sofa", label: "Sofa", icon: WeekendRounded },
  { id: "plant", label: "Plant", icon: ParkRounded },
  { id: "storage", label: "Cabinet", icon: GridViewRounded },
  { id: "bookshelf", label: "Bookshelf", icon: GridViewRounded },
  { id: "printer", label: "Printer", icon: PrintRounded },
  { id: "water", label: "Water", icon: LocalDrinkRounded },
  { id: "coffee", label: "Coffee", icon: CoffeeRounded },
  { id: "bin", label: "Bin", icon: DeleteRounded },
  { id: "sideTable", label: "Side table", icon: GridViewRounded },
  { id: "erase", label: "Erase", icon: DeleteOutlineRounded },
];

const TOOL_ASSET_PREVIEWS = {
  desk: "/office-sprites/agents/Furni/Desk-2.png",
  table: "/office-sprites/agents/Furni/Big-Round-Table.png",
  sofa: "/office-sprites/agents/Furni/Big-Sofa.png",
  plant: "/office-sprites/agents/Furni/Small-Plant.png",
  storage: "/office-sprites/agents/Furni/Big-Filing-Cabinet.png",
  bookshelf: "/office-sprites/agents/Furni/Tall-Bookshelf.png",
  printer: "/office-sprites/agents/Furni/Big-Office-Printer.png",
  water: "/office-sprites/agents/Furni/Water-Dispenser.png",
  coffee: "/office-sprites/agents/Furni/Coffee-Machine.png",
  bin: "/office-sprites/agents/Furni/Bin.png",
  sideTable: "/office-sprites/agents/Furni/Small-Table.png",
};

function ToolButton({ tool, active, onClick }) {
  const Icon = tool.icon;
  const assetSrc = TOOL_ASSET_PREVIEWS[tool.id];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
        active ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
      )}
    >
      {assetSrc ? (
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border", active ? "border-white/15 bg-white/10" : "border-neutral-200 bg-neutral-50")}>
          <img
            src={assetSrc}
            alt=""
            aria-hidden="true"
            className="h-6 w-6 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        </span>
      ) : (
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border", active ? "border-white/15 bg-white/10" : "border-neutral-200 bg-neutral-50")}>
          <Icon sx={{ fontSize: 18 }} />
        </span>
      )}
      <span>{tool.label}</span>
    </button>
  );
}

function moveSelectedItem(layout, item, deltaX, deltaY) {
  const candidate = { ...item, x: item.x + deltaX, y: item.y + deltaY };
  return canPlaceLayoutItem(layout, candidate, item.id)
    ? { ...layout, items: layout.items.map((entry) => (entry.id === item.id ? candidate : entry)) }
    : layout;
}

export function OfficeEditorModal({
  open,
  onClose,
  draftLayout,
  setDraftLayout,
}) {
  const [tool, setTool] = useState("select");
  const [selectedTile, setSelectedTile] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState("");

  useEffect(() => {
    if (!open) {
      setTool("select");
      setSelectedTile(null);
      setSelectedItemId("");
    }
  }, [open]);

  const selectedItem = useMemo(
    () => draftLayout.items.find((item) => item.id === selectedItemId) || null,
    [draftLayout.items, selectedItemId],
  );

  const placementToolActive = !["select", "erase"].includes(tool) && !tool.startsWith("floor-");
  const pendingPlacement = useMemo(() => {
    if (!placementToolActive || !selectedTile) return null;
    return createLayoutItem(tool, selectedTile.x, selectedTile.y);
  }, [placementToolActive, selectedTile, tool]);

  const canPlacePending = useMemo(() => {
    if (!pendingPlacement) return false;
    return canPlaceLayoutItem(draftLayout, pendingPlacement);
  }, [draftLayout, pendingPlacement]);

  function handleTileClick(x, y) {
    setSelectedTile({ x, y });

    if (tool === "select") {
      const item = getEditorTileSelection(draftLayout, x, y);
      setSelectedItemId(item?.id || "");
      return;
    }

    if (tool === "erase") {
      const item = findItemAtTile(draftLayout, x, y);
      setSelectedItemId(item?.id || "");
      return;
    }

    if (tool.startsWith("floor-")) {
      const tone = tool.replace("floor-", "");
      setDraftLayout((current) => upsertFloorPatch(current, x, y, tone));
      return;
    }
  }

  function handleRotate() {
    if (!selectedItem) return;
    const rotated = rotateLayoutItem(selectedItem);
    if (!canPlaceLayoutItem(draftLayout, rotated, selectedItem.id)) return;
    setDraftLayout((current) => ({
      ...current,
      items: current.items.map((entry) => (entry.id === selectedItem.id ? rotated : entry)),
    }));
  }

  function handleDelete() {
    if (!selectedItem) return;
    const confirmed = window.confirm(`Eliminar "${selectedMeta?.label || selectedItem.type}" de la oficina?`);
    if (!confirmed) return;
    setDraftLayout((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== selectedItem.id) }));
    setSelectedItemId("");
  }

  function handleConfirmPlacement() {
    if (!pendingPlacement || !canPlacePending) return;
    setDraftLayout((current) => ({ ...current, items: [...current.items, pendingPlacement] }));
    setSelectedItemId(pendingPlacement.id);
    setTool("select");
  }

  if (!open) return null;

  const selectedMeta = selectedItem ? OFFICE_ITEM_LIBRARY[selectedItem.type] : null;
  const selectedFootprint = selectedItem ? getItemFootprint(selectedItem) : null;
  const previewType = selectedItem?.type || pendingPlacement?.type || (placementToolActive ? tool : "");
  const previewRotation = selectedItem?.rotation || pendingPlacement?.rotation || 0;

  return (
    <div className="fixed inset-0 z-[120] bg-black/20 px-6 py-5 backdrop-blur-[2px]">
      <div className="mx-auto flex max-h-[87vh] max-w-[1480px] gap-4">
        <div className="flex h-[87vh] max-h-[810px] w-[240px] flex-col rounded-xl border border-neutral-200 bg-[#f8f8f7] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">Office editor</div>
              <div className="mt-1 text-lg font-semibold tracking-tight text-neutral-950">Diseña la oficina</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-50"
              aria-label="Cerrar editor"
            >
              <CloseRounded sx={{ fontSize: 18 }} />
            </button>
          </div>

          <div className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {EDITOR_TOOLS.map((entry) => (
              <ToolButton key={entry.id} tool={entry} active={tool === entry.id} onClick={() => setTool(entry.id)} />
            ))}
          </div>
        </div>

        <div className="min-w-0 flex h-[87vh] max-h-[810px] flex-1 flex-col rounded-xl border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <div className="text-sm font-medium text-neutral-900">Editor expandido</div>
              <div className="mt-1 text-sm text-neutral-500">Toma el enfoque de `pixel-agents`: floor, walls y furniture desde una vista integrada.</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto p-5">
            <OfficeScene
              layout={draftLayout}
              agents={[]}
              selectedAgentId=""
              setSelectedAgentId={() => {}}
              teamNotes={{}}
              busyAgentId=""
              showGrid
              onTileClick={handleTileClick}
              selectedTile={selectedTile}
              className="h-[560px]"
            />
            <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div>
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">Preview</div>
                <OfficeFurniturePreview type={previewType} rotation={previewRotation} />
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4">
                <div className="text-sm font-medium text-neutral-900">
                  {placementToolActive
                    ? "Colocación asistida"
                    : tool === "erase"
                      ? "Eliminación asistida"
                      : "Selección actual"}
                </div>
                <div className="mt-2 text-sm leading-6 text-neutral-500">
                  {placementToolActive && selectedTile
                    ? `Destino elegido: tile ${selectedTile.x}, ${selectedTile.y}. Confirma antes de colocar el objeto.`
                    : placementToolActive
                      ? "Haz clic en un tile para elegir dónde colocar el objeto."
                      : tool === "erase" && selectedItem
                        ? `Seleccionaste ${selectedMeta?.label || selectedItem.type}. Confirma si quieres eliminarlo.`
                        : tool === "erase"
                          ? "Haz clic sobre un objeto para seleccionarlo y luego confirmar su eliminación."
                          : selectedItem
                            ? `Elemento seleccionado en tile ${selectedItem.x}, ${selectedItem.y}.`
                            : "Selecciona un objeto o un tile para continuar."}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {placementToolActive ? (
                    <Button onClick={handleConfirmPlacement} disabled={!pendingPlacement || !canPlacePending}>
                      Confirmar colocación
                    </Button>
                  ) : null}
                  {tool === "erase" ? (
                    <Button variant="outline" onClick={handleDelete} disabled={!selectedItem}>
                      Confirmar eliminación
                    </Button>
                  ) : null}
                  {selectedTile ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedTile(null);
                        if (tool !== "select") setSelectedItemId("");
                      }}
                    >
                      Limpiar selección
                    </Button>
                  ) : null}
                </div>
                {placementToolActive && selectedTile && !canPlacePending ? (
                  <div className="mt-3 text-sm text-amber-700">
                    Ese lugar no está disponible para este objeto. Prueba otro tile.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-[87vh] max-h-[810px] w-[300px] flex-col rounded-xl border border-neutral-200 bg-[#f8f8f7] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">Inspector</div>
          <div className="mt-2 text-base font-semibold text-neutral-950">
            {selectedMeta ? selectedMeta.label : "Selecciona un elemento"}
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {selectedItem && selectedMeta ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-neutral-200 bg-white px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-neutral-400">Footprint</div>
                  <div className="mt-2 text-sm font-medium text-neutral-900">
                    {selectedFootprint.width} x {selectedFootprint.height}
                  </div>
                  <div className="mt-1 text-sm text-neutral-500">
                    Tile {selectedItem.x}, {selectedItem.y}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.12em] text-neutral-400">Mover</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div />
                    <Button variant="outline" onClick={() => setDraftLayout((current) => moveSelectedItem(current, selectedItem, 0, -1))}>
                      ?
                    </Button>
                    <div />
                    <Button variant="outline" onClick={() => setDraftLayout((current) => moveSelectedItem(current, selectedItem, -1, 0))}>
                      ?
                    </Button>
                    <Button variant="outline" onClick={() => setDraftLayout((current) => moveSelectedItem(current, selectedItem, 1, 0))}>
                      ?
                    </Button>
                    <div />
                    <Button variant="outline" onClick={() => setDraftLayout((current) => moveSelectedItem(current, selectedItem, 0, 1))}>
                      ?
                    </Button>
                    <div />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" onClick={handleRotate} disabled={!selectedMeta.rotatable}>
                    <RotateRightRounded sx={{ fontSize: 16 }} />
                    Rotar
                  </Button>
                  <Button variant="outline" onClick={handleDelete}>
                    <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                    Borrar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-white px-4 py-4 text-sm leading-6 text-neutral-500">
                Selecciona un escritorio, partici?n o mueble para moverlo, rotarlo o quitarlo. Los cambios quedan guardados localmente en este panel.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
