"use client";

import { useState } from "react";
import type { DragEvent } from "react";

interface MidiImporterProps {
  onImport: (file: File) => Promise<void>;
}

/**
 * Native drag-and-drop MIDI importer.
 */
export function MidiImporter({ onImport }: MidiImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (!file) {
      return;
    }

    setLoading(true);
    try {
      await onImport(file);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={[
        "rounded-lg border border-dashed p-4 text-center text-sm transition-colors",
        isDragging
          ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
          : "border-zinc-700 bg-zinc-950 text-zinc-400",
      ].join(" ")}
    >
      {loading ? "Importing MIDI..." : "Drop a .mid file here to import pattern"}
    </section>
  );
}
