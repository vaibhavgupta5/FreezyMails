// Liveness probe for containers and load balancers. No auth, no database.
export function GET() {
  return Response.json({ ok: true })
}

export const dynamic = 'force-dynamic'
