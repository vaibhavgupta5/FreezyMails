import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { authenticateApiKey, bearerToken } from '@/lib/api-auth'
import { createFreezyMcpServer } from '@/lib/mcp-server'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

function unauthorized() {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized: send a valid FreezyMails API key as a Bearer token.' }, id: null },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="freezymails"' } },
  )
}

function methodNotAllowed() {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. This server is stateless: use POST.' }, id: null },
    { status: 405, headers: { Allow: 'POST' } },
  )
}

// Stateless streamable HTTP: a fresh server and transport per request, scoped to the key's user.
export async function POST(request: Request) {
  const auth = await authenticateApiKey(request)
  if (!auth) return unauthorized()

  const server = createFreezyMcpServer(auth)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)

  return transport.handleRequest(request, {
    authInfo: { token: bearerToken(request) ?? '', clientId: auth.keyId, scopes: auth.scopes },
  })
}

export async function GET() {
  return methodNotAllowed()
}

export async function DELETE() {
  return methodNotAllowed()
}
