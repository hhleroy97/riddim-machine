import { StudioApp } from "@/components/studio/StudioApp";

export default function StudioPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-6 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">RIDDIM Studio</h1>
          <p className="text-sm text-zinc-400">
            Program loops, import MIDI, and shape drops with AI agents.
          </p>
        </header>
        <StudioApp />
      </div>
    </main>
  );
}
