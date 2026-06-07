export default function PageSkeleton() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 w-full animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 bg-surface-300 rounded w-1/4"></div>
        <div className="h-10 bg-surface-300 rounded w-32"></div>
      </div>

      <div className="skeu-card p-6 space-y-4">
        <div className="h-4 bg-surface-300 rounded w-3/4"></div>
        <div className="h-4 bg-surface-300 rounded w-1/2"></div>
        <div className="h-4 bg-surface-300 rounded w-5/6"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="skeu-card p-6 space-y-3 h-32">
          <div className="h-4 bg-surface-300 rounded w-1/3"></div>
          <div className="h-8 bg-surface-300 rounded w-1/4"></div>
        </div>
        <div className="skeu-card p-6 space-y-3 h-32">
          <div className="h-4 bg-surface-300 rounded w-1/3"></div>
          <div className="h-8 bg-surface-300 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
}
