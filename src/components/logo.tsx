import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The Athena wordmark. Renders in its native carbon tone on light surfaces and
 * inverts to a light weave on dark surfaces so it stays legible in both themes.
 */
export function Logo({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/athena-logo.png"
      alt="Athena"
      width={1000}
      height={272}
      priority={priority}
      className={cn("h-7 w-auto select-none dark:invert", className)}
    />
  );
}
