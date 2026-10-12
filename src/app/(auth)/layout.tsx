import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex justify-center">
        <Logo className="h-8 w-auto" priority />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
