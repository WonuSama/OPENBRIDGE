"use client";

import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import { useState } from "react";
import { cn } from "@/lib/utils";

function formatEventTime(at) {
  if (!at) return "--:--";
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MultiagentsEventsPanel({ title, teamEvents, emptyText, live = false, defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        className="flex w-full items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
          <AutoAwesomeRounded sx={{ fontSize: 17 }} />
          {title}
        </div>
        <div className="flex items-center gap-2">
          {live ? <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-700">Live</span> : null}
          <KeyboardArrowDownRounded
            sx={{
              fontSize: 18,
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 180ms ease",
            }}
          />
        </div>
      </button>
      {!collapsed ? (
        <div className="space-y-2 p-4">
          {teamEvents.length ? (
            teamEvents.slice(0, 8).map((event) => (
              <div key={event.id} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {event.speaker ? <span className="text-xs font-semibold text-neutral-900">{event.speaker}</span> : null}
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">{formatEventTime(event.at)}</span>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-medium",
                      event.kind === "meeting" ? "bg-sky-50 text-sky-700" : event.tone === "good" ? "bg-emerald-50 text-emerald-700" : event.tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-neutral-600",
                    )}
                  >
                    {event.kind === "meeting" ? "meeting" : event.tone === "good" ? "live" : event.tone === "warn" ? "notice" : "update"}
                  </span>
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-neutral-600">{event.message}</div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">{emptyText}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
