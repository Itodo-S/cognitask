"use client";

import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="font-hand text-[34px] leading-tight text-redpen-500">
        Something got smudged.
      </p>
      <p className="mt-3 max-w-md font-note text-[16px] leading-relaxed text-pencil-500">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="mt-6">
        <Button onClick={reset}>Try that again</Button>
      </div>
    </div>
  );
}
