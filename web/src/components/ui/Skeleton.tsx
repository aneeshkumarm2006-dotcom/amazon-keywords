import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
  /** Screen-reader status text while content loads. */
  label?: string;
}

/** A neutral loading placeholder. Pulse is disabled under reduced motion. */
export function Skeleton({ className, label }: SkeletonProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block animate-pulse rounded-lg bg-surface-2", className)}
    />
  );
}

/** A few stacked lines, for text blocks. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </span>
  );
}

/** Card-shaped placeholder for grid loading states. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-hairline bg-surface p-5", className)}>
      <Skeleton className="h-7 w-7 rounded-lg" />
      <Skeleton className="mt-4 h-4 w-2/3" />
      <SkeletonText lines={2} className="mt-3" />
    </div>
  );
}
