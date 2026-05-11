"use client";

import type { StudioWorkspace } from "@/stores/uiStore";

interface WorkspaceTabsProps {
  activeWorkspace: StudioWorkspace;
  onSelectWorkspace: (workspace: StudioWorkspace) => void;
}

const WORKSPACES: Array<{ id: StudioWorkspace; label: string; description: string }> = [
  { id: "pattern", label: "Pattern", description: "Drums, scale notes, clips" },
  { id: "arrangement", label: "Arrangement", description: "Sections, lanes, automation" },
  { id: "sound-design", label: "Sound Design", description: "Synths and device chains" },
  { id: "mixer", label: "Mixer", description: "Levels, mute, mix coach" },
];

/**
 * Workspace picker — switches the single visible studio pane by tab.
 */
export function WorkspaceTabs({
  activeWorkspace,
  onSelectWorkspace,
}: WorkspaceTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {WORKSPACES.map((workspace) => {
        const active = workspace.id === activeWorkspace;
        return (
          <button
            key={workspace.id}
            type="button"
            className={[
              "rounded-lg border px-3 py-2 text-left transition-colors",
              active
                ? "border-lime-400 bg-lime-400/15 text-lime-100"
                : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700",
            ].join(" ")}
            onClick={() => onSelectWorkspace(workspace.id)}
          >
            <span className="block text-xs font-bold uppercase tracking-wide">
              {workspace.label}
            </span>
            <span className="block text-[10px] text-zinc-500">{workspace.description}</span>
          </button>
        );
      })}
    </div>
  );
}
