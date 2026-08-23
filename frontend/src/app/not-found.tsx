import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="font-hand text-[52px] leading-none text-pencil-300">404</p>
      <p className="mt-3 font-hand text-[28px] leading-tight text-ink-900">
        That page was never written.
      </p>
      <p className="mt-2 max-w-md font-note text-[16px] text-pencil-400">
        Nothing here — try the front page.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button>Back to today</Button>
        </Link>
      </div>
    </div>
  );
}
