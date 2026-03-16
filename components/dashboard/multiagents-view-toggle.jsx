"use client";

import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import WidgetsRounded from "@mui/icons-material/WidgetsRounded";
import { cn } from "@/lib/utils";

export function MultiagentsViewToggle({ view, setView }) {
  return (
    <div className="inline-flex rounded-md border border-neutral-200 bg-white p-1">
      <button
        type="button"
        onClick={() => setView("control")}
        className={cn(
          "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
          view === "control" ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-50",
        )}
      >
        <WidgetsRounded sx={{ fontSize: 16 }} />
        Control
      </button>
      <button
        type="button"
        onClick={() => setView("office")}
        className={cn(
          "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
          view === "office" ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-50",
        )}
      >
        <ApartmentRounded sx={{ fontSize: 16 }} />
        Oficina
      </button>
    </div>
  );
}
