import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Loading placeholder shaped like the real page (controls, eight tiles,
 * chart + alerts, table, two money cards) so nothing jumps when data lands.
 */
export function OverviewSkeleton() {
  return (
    <div aria-busy="true">
      <Skeleton label="Loading the overview" className="sr-only" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3" aria-hidden="true">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex h-[7.25rem] flex-col gap-2 rounded-xl border border-hairline bg-surface p-3.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3" aria-hidden="true">
        <div className="rounded-xl border border-hairline bg-surface xl:col-span-2">
          <div className="border-b border-hairline px-5 py-3.5">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="p-3">
            <Skeleton className="h-[280px] w-full" />
          </div>
          <div className="h-11 border-t border-hairline" />
        </div>
        <div className="rounded-xl border border-hairline bg-surface">
          <div className="border-b border-hairline px-5 py-3.5">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-4 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-hairline bg-surface" aria-hidden="true">
        <div className="border-b border-hairline px-5 py-3.5">
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
