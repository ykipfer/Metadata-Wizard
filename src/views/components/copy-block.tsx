import { useState } from "react";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        setState((await copyText(text)) ? "ok" : "fail");
        setTimeout(() => setState("idle"), 2000);
      }}
      className="shrink-0 text-[12px] px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      {state === "ok" ? "✓ Kopiert" : state === "fail" ? "Kopieren blockiert — bitte manuell markieren" : (label ?? "Kopieren")}
    </button>
  );
}

export default function CopyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800">
        <span className="text-[13px] font-medium">{title}</span>
        <CopyButton text={text} />
      </div>
      <pre className="p-3 text-[12px] leading-relaxed overflow-x-auto max-h-72 whitespace-pre-wrap select-all bg-white dark:bg-zinc-950">
        {text}
      </pre>
    </div>
  );
}
