import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <main className="max-w-xl space-y-4 text-center">
        <h1 className="text-4xl font-black tracking-tight">RIDDIM</h1>
        <p className="text-zinc-400">
          AI-powered browser studio for building dubstep loops in real-time.
        </p>
        <Link
          href="/studio"
          className="inline-flex rounded bg-lime-400 px-4 py-2 font-semibold text-zinc-950"
        >
          Open Studio
        </Link>
      </main>
    </div>
  );
}
