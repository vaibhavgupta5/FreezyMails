export default function Loading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 bg-surface-300 rounded w-1/4 mb-8"></div>
      <div className="space-y-4">
        <div className="h-24 bg-surface-200 rounded-xl"></div>
        <div className="h-24 bg-surface-200 rounded-xl"></div>
        <div className="h-24 bg-surface-200 rounded-xl"></div>
      </div>
    </div>
  )
}
