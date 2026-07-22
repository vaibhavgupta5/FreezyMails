import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | PrismaClient
}

// Lazy instantiate Prisma to avoid Next.js build-time module evaluation errors
const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (prop === 'then') return undefined; // Prevent promise-like behavior
    if (!globalThis.prismaGlobal) {
      globalThis.prismaGlobal = prismaClientSingleton()
    }
    const targetProp = (globalThis.prismaGlobal as unknown as Record<string | symbol, unknown>)[prop];
    return typeof targetProp === 'function' ? targetProp.bind(globalThis.prismaGlobal) : targetProp;
  }
})

export default prisma

if (process.env.NODE_ENV !== 'production') {
  if (!globalThis.prismaGlobal) {
    globalThis.prismaGlobal = prismaClientSingleton()
  }
}
