"use client";

import { useRouter } from "next/navigation";

export function EditorRetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded border border-neutral-400 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
    >
      Retry
    </button>
  );
}
