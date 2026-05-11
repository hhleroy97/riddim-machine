"use client";

import type { ReactNode } from "react";

interface StudioShellProps {
  transport: ReactNode;
  sidebar: ReactNode;
  tabs: ReactNode;
  workspace: ReactNode;
  inspector: ReactNode;
  docks: ReactNode;
}

/**
 * DAW-style frame for persistent transport, browser rail, workspace, and detail docks.
 */
export function StudioShell({
  transport,
  sidebar,
  tabs,
  workspace,
  inspector,
  docks,
}: StudioShellProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
      <div className="border-b border-zinc-800 bg-zinc-950/95 p-3">{transport}</div>
      <div className="grid min-h-[720px] grid-cols-[220px_minmax(0,1fr)] bg-zinc-950">
        <aside className="border-r border-zinc-800 bg-zinc-950/80 p-3">{sidebar}</aside>
        <section className="flex min-w-0 flex-col">
          <div className="border-b border-zinc-800 bg-zinc-900/40 px-3 py-2">{tabs}</div>
          <div className="min-h-0 flex-1 overflow-auto p-4">{workspace}</div>
          <div className="border-t border-zinc-800 bg-zinc-950/90 p-3">{inspector}</div>
        </section>
      </div>
      <div className="border-t border-zinc-800 bg-zinc-950 p-3">{docks}</div>
    </div>
  );
}
