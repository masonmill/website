"use client";

import { useRouter } from "next/navigation";
import { secondaryButton } from "./ui";

export function EditorRetryButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className={secondaryButton}>
      Retry
    </button>
  );
}
