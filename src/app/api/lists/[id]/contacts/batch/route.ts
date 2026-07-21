import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure list belongs to user
    const list = await prisma.mailingList.findFirst({
      where: { id: id, userId: user.id },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { contacts } = body; 

    if (!Array.isArray(contacts)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // We can do this in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const processed = [];
      for (const contact of contacts) {
        if (!contact.email) continue;
        
        const upserted = await tx.contact.upsert({
          where: {
            mailingListId_email: {
              mailingListId: id,
              email: contact.email,
            }
          },
          update: {
            customFields: contact.customFields || {},
          },
          create: {
            mailingListId: id,
            email: contact.email,
            customFields: contact.customFields || {},
          }
        });
        processed.push(upserted);
      }
      return processed;
    });

    return NextResponse.json({ success: true, contacts: results });
  } catch (_error: unknown) { const error = _error as Error;
    console.error("Error in batch contacts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await prisma.mailingList.findFirst({
      where: { id: id, userId: user.id },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    await prisma.contact.deleteMany({
      where: {
        id: { in: ids },
        mailingListId: id,
      },
    });

    return NextResponse.json({ success: true, deletedCount: ids.length });
  } catch (_error: unknown) { const error = _error as Error;
    console.error("Error deleting batch contacts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

