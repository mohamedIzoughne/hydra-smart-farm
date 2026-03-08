import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  rows?: number;
  cols?: number;
}

export function LoadingSkeleton({ rows = 5, cols = 4 }: LoadingSkeletonProps) {
  return (
    <div className="border rounded-lg overflow-hidden animate-pulse">
      <div className="h-11 bg-muted" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex border-t">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="flex-1 px-4 py-3">
              <div className={cn("h-4 rounded bg-muted/60", c === 0 ? "w-24" : "w-16")} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
