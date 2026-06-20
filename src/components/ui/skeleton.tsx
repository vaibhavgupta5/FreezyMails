import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-300 dark:bg-surface-700", className)}
      {...props}
    />
  )
}

export { Skeleton }
