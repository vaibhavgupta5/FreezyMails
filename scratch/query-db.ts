const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const campaign = await prisma.campaign.findFirst({
    where: { status: 'DRAFT' },
    include: {
      template: true,
      emailAccounts: true,
      recipients: true
    }
  })
  console.dir(campaign, { depth: null })
}

main().catch(console.error).finally(() => prisma.$disconnect())
