import { Skeleton } from "@/components/ui/skeleton"

export default function PageSkeleton() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 w-full animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeu-card p-6 flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main card - spans 2 cols */}
        <div className="lg:col-span-2 skeu-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-md shrink-0" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar card */}
        <div className="skeu-card p-6 space-y-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
