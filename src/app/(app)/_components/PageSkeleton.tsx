import { Skeleton } from "@/components/ui/skeleton"

export default function PageSkeleton() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 w-full">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="skeu-card p-6 space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="skeu-card p-6 space-y-3 h-32">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-1/4" />
        </div>
        <div className="skeu-card p-6 space-y-3 h-32">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-1/4" />
        </div>
      </div>
    </div>
  );
}
