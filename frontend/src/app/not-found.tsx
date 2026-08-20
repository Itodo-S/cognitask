import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 mb-6 bg-ink-100 rounded-full flex items-center justify-center">
        <span className="font-serif text-2xl font-bold text-ink-400">404</span>
      </div>
      <h2 className="font-serif text-xl font-semibold text-ink-900 mb-2">Page not found</h2>
      <p className="font-sans text-sm text-ink-500 mb-6 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
