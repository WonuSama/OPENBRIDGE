import { cn } from "@/lib/utils";
import { assignAgentsToDesks, findItemAtTile, getItemFootprint, inferAgentCluster } from "@/components/dashboard/office-layout";

const STATUS_META = {
  responding: {
    label: "Responding",
    dot: "bg-emerald-500",
  },
  loading: {
    label: "Checking",
    dot: "bg-amber-500",
  },
  idle: {
    label: "Idle",
    dot: "bg-neutral-300",
  },
};

const FLOOR_PATCH_STYLES = {
  warm: "bg-[#e9dcc6]/42",
  soft: "bg-[#dde2e4]/28",
  cool: "bg-[#d8e6e1]/28",
};

function getAgentStatus(agentId, busyAgentId, teamNotes) {
  if (busyAgentId === agentId) return STATUS_META.loading;
  if (teamNotes[agentId]) return STATUS_META.responding;
  return STATUS_META.idle;
}

export function PixelAgentSprite({ variant = 0, active = false, busy = false }) {
  const frameWidth = 32;
  const frameHeight = 32;
  const frameCol = busy ? 1 : 0;
  const bodyRow = variant % 6;
  const hairRow = variant % 8;
  const outfitIndex = (variant % 6) + 1;
  const scale = active ? 2.22 : 2.02;
  const offsetX = active ? 11 : 10;
  const offsetY = active ? -8 : -6;

  const sharedImageStyle = {
    width: 768,
    maxWidth: "none",
    imageRendering: "pixelated",
  };

  return (
    <div
      className={cn("absolute left-1/2 z-[4] -translate-x-1/2", busy ? "animate-pulse" : "animate-[officeFloat_4s_ease-in-out_infinite]")}
      style={{
        bottom: `${offsetY}px`,
        width: `${frameWidth * scale}px`,
        height: `${frameHeight * scale}px`,
        marginLeft: `${offsetX}px`,
      }}
    >
      <div
        className="absolute bottom-0 left-0 overflow-hidden"
        style={{
          width: `${frameWidth}px`,
          height: `${frameHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "bottom left",
        }}
      >
        <img
          src="/office-sprites/agents/CharacterModel/Character Model.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0"
          style={{
            ...sharedImageStyle,
            height: 192,
            transform: `translate(${-frameCol * frameWidth}px, ${-bodyRow * frameHeight}px)`,
          }}
        />
        <img
          src={`/office-sprites/agents/Outfits/Outfit${outfitIndex}.png`}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0"
          style={{
            ...sharedImageStyle,
            height: 32,
            transform: `translate(${-frameCol * frameWidth}px, 0px)`,
          }}
        />
        <img
          src="/office-sprites/agents/Hair/Hairs.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0"
          style={{
            ...sharedImageStyle,
            height: 256,
            transform: `translate(${-frameCol * frameWidth}px, ${-hairRow * frameHeight}px)`,
          }}
        />
      </div>
      {active ? <div className="pointer-events-none absolute inset-0 ring-1 ring-sky-400/40" /> : null}
    </div>
  );
}

function FurnitureSprite({ src, className = "", rotation = 0, pixelated = true }) {
  return (
    <div className={cn("relative h-full w-full", rotation % 180 !== 0 && "rotate-90")}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={cn("absolute inset-0 h-full w-full object-contain", className)}
        style={{ imageRendering: pixelated ? "pixelated" : "auto" }}
      />
    </div>
  );
}

function PartitionItem({ rotation = 0 }) {
  const horizontal = rotation % 180 === 90;
  return (
    <div className={cn("relative h-full w-full", horizontal ? "bg-white/55" : "bg-white/50")}>
      <div className={cn("absolute inset-0 border border-white/60", horizontal ? "shadow-[0_0_0_1px_rgba(255,255,255,0.2)]" : "shadow-[0_0_0_1px_rgba(255,255,255,0.16)]")} />
    </div>
  );
}

function RugItem() {
  return <div className="h-full w-full border border-white/30 bg-white/28" />;
}

function renderFurnitureItem(item, occupied, active) {
  switch (item.type) {
    case "desk":
      return (
        <div className="relative h-full w-full">
          <FurnitureSprite
            src={
              occupied || active
                  ? "/office-sprites/agents/Furni/Desk-2.png"
                  : "/office-sprites/agents/Furni/Desk.png"
            }
            className="drop-shadow-[0_8px_10px_rgba(15,23,42,0.12)]"
          />
        </div>
      );
    case "table":
      return <FurnitureSprite src="/office-sprites/agents/Furni/Big-Round-Table.png" className="scale-[1.12] drop-shadow-[0_8px_10px_rgba(15,23,42,0.08)]" />;
    case "sofa":
      return <FurnitureSprite src="/office-sprites/agents/Furni/Big-Sofa.png" rotation={item.rotation || 0} className="scale-[1.08] drop-shadow-[0_8px_10px_rgba(15,23,42,0.08)]" />;
    case "plant":
      return <FurnitureSprite src="/office-sprites/agents/Furni/Small-Plant.png" className="scale-[1.18] drop-shadow-[0_8px_8px_rgba(15,23,42,0.08)]" />;
    case "board":
      return <FurnitureSprite src="/office-sprites/agents/Furni/Wall-Graph.png" rotation={item.rotation || 0} />;
    case "storage":
      return <FurnitureSprite src="/office-sprites/agents/Furni/Big-Filing-Cabinet.png" rotation={item.rotation || 0} className="scale-[1.3]" />;
    case "bookshelf":
      return <FurnitureSprite src="/office-sprites/agents/Furni/Tall-Bookshelf.png" rotation={item.rotation || 0} className="scale-[1.34]" />;
    case "printer":
      return <FurnitureSprite src="/office-sprites/agents/Furni/Big-Office-Printer.png" rotation={item.rotation || 0} className="scale-[1.18]" />;
    case "water":
      return <FurnitureSprite src="/office-sprites/agents/Furni/Water-Dispenser.png" rotation={item.rotation || 0} className="scale-[1.35]" />;
    case "bin":
      return <FurnitureSprite src="/office-sprites/agents/Furni/Bin.png" className="scale-[1.1] drop-shadow-[0_6px_8px_rgba(15,23,42,0.08)]" />;
    case "coffee":
      return (
        <div className="relative h-full w-full">
          <FurnitureSprite src="/office-sprites/agents/Furni/Small-Table.png" className="scale-[1.18] drop-shadow-[0_8px_10px_rgba(15,23,42,0.08)]" />
          <img
            src="/office-sprites/agents/Furni/Coffee-Machine.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[8%] z-[3] h-[54%] w-[54%] -translate-x-1/2 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      );
    case "sideTable":
      return <FurnitureSprite src="/office-sprites/agents/Furni/Small-Table.png" rotation={item.rotation || 0} className="drop-shadow-[0_8px_10px_rgba(15,23,42,0.08)]" />;
    case "partition":
      return <PartitionItem rotation={item.rotation || 0} />;
    case "rug":
      return <RugItem />;
    default:
      return null;
  }
}

export function OfficeFurniturePreview({ type, rotation = 0, occupied = false, active = false }) {
  if (!type) {
    return <div className="flex h-28 items-center justify-center border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-400">Sin preview</div>;
  }

  return (
    <div className="flex h-28 items-center justify-center border border-neutral-200 bg-[#f6f5f2] p-3">
      <div className="relative h-20 w-24">
        {renderFurnitureItem({ type, rotation }, occupied, active)}
      </div>
    </div>
  );
}

export function OfficeScene({
  layout,
  agents,
  selectedAgentId,
  setSelectedAgentId,
  teamNotes,
  speechBubbles = {},
  busyAgentId,
  showGrid = false,
  onTileClick,
  selectedTile,
  className = "",
}) {
  const deskAssignments = assignAgentsToDesks(layout, agents);
  const cellWidth = 100 / layout.cols;
  const cellHeight = 100 / layout.rows;
  const patchOverlapX = cellWidth * 0.28;
  const patchOverlapY = cellHeight * 0.28;

  return (
    <div
      className={cn("relative h-[620px] overflow-hidden border border-neutral-200 bg-[#e7e3da]", className)}
      style={{
        backgroundImage: "url('/floor.png')",
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }}
    >
      {layout.floorPatches.map((patch) => (
        <div
          key={patch.id}
          className={cn("absolute", FLOOR_PATCH_STYLES[patch.tone] || FLOOR_PATCH_STYLES.soft)}
          style={{
            left: `calc(${patch.x * cellWidth}% - ${patchOverlapX}%)`,
            top: `calc(${patch.y * cellHeight}% - ${patchOverlapY}%)`,
            width: `calc(${patch.w * cellWidth}% + ${patchOverlapX * 2}%)`,
            height: `calc(${patch.h * cellHeight}% + ${patchOverlapY * 2}%)`,
          }}
        />
      ))}

      {showGrid ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.22) 1px, transparent 1px)`,
            backgroundSize: `${100 / layout.cols}% ${100 / layout.rows}%`,
          }}
        />
      ) : null}

      {showGrid && onTileClick
        ? Array.from({ length: layout.rows * layout.cols }, (_, index) => {
            const x = index % layout.cols;
            const y = Math.floor(index / layout.cols);
            const isSelected = selectedTile && selectedTile.x === x && selectedTile.y === y;
            return (
              <button
                key={`tile-${x}-${y}`}
                type="button"
                onClick={() => onTileClick(x, y)}
                className={cn("absolute border border-transparent transition-colors", isSelected ? "bg-sky-400/12 ring-1 ring-sky-500/50" : "hover:bg-neutral-900/5")}
                style={{
                  left: `${x * cellWidth}%`,
                  top: `${y * cellHeight}%`,
                  width: `${cellWidth}%`,
                  height: `${cellHeight}%`,
                }}
                aria-label={`Tile ${x}, ${y}`}
              />
            );
          })
        : null}

      {layout.items.map((item, index) => {
        const footprint = getItemFootprint(item);
        const occupant = item.type === "desk" ? deskAssignments.get(item.id) : null;
        const occupied = Boolean(occupant);
        const editorSelected = selectedTile
          ? selectedTile.x >= item.x &&
            selectedTile.x < item.x + footprint.width &&
            selectedTile.y >= item.y &&
            selectedTile.y < item.y + footprint.height
          : false;
        const active = occupant ? occupant.id === selectedAgentId : editorSelected;
        const status = occupant ? getAgentStatus(occupant.id, busyAgentId, teamNotes) : STATUS_META.idle;
        const roleCluster = occupant ? inferAgentCluster(occupant) : null;
        const bubbleText = occupant ? String(speechBubbles[occupant.id] || "").trim() : "";
        const canClickItem = Boolean(occupant) || Boolean(onTileClick);
        return (
          <button
            key={item.id}
            type="button"
            disabled={!canClickItem}
            onClick={() => {
              if (occupant) {
                setSelectedAgentId(occupant.id);
                return;
              }
              if (onTileClick) onTileClick(item.x, item.y);
            }}
            className={cn("absolute text-left", canClickItem ? "cursor-pointer" : "cursor-default")}
            style={{
              left: `${item.x * cellWidth}%`,
              top: `${item.y * cellHeight}%`,
              width: `${footprint.width * cellWidth}%`,
              height: `${footprint.height * cellHeight}%`,
              zIndex: item.type === "partition" ? 2 : 3 + index,
            }}
          >
            {renderFurnitureItem(item, occupied, active)}
            {occupant ? (
              <>
                <PixelAgentSprite
                  variant={(agents.findIndex((agent) => agent.id === occupant.id) + Math.max(item.x, 0)) % 6}
                  active={active}
                  busy={busyAgentId === occupant.id}
                />
                <div className="pointer-events-none absolute left-1/2 top-[-8px] z-[5] -translate-x-1/2 text-center">
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_0_10px_rgba(0,0,0,0.4)]">
                    <span className={cn("h-2 w-2 rounded-full", status.dot)} />
                    <span className="max-w-[84px] truncate">{occupant.identityName || occupant.id}</span>
                  </div>
                </div>
                {bubbleText ? (
                  <div className="pointer-events-none absolute left-1/2 top-[-44px] z-[6] w-[136px] -translate-x-1/2">
                    <div className="rounded-lg border border-white/60 bg-white/95 px-2.5 py-2 text-[11px] leading-4 text-neutral-700 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                      <span className="block truncate">{bubbleText}</span>
                    </div>
                  </div>
                ) : null}
                {roleCluster && !active ? <span className="sr-only">{roleCluster}</span> : null}
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function getEditorTileSelection(layout, x, y) {
  return findItemAtTile(layout, x, y);
}
