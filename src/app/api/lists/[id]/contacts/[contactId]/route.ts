import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await prisma.mailingList.findFirst({
      where: { id, userId: user.id },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const { email, customFields } = await req.json();

    const dataToUpdate: Record<string, unknown> = {};
    if (email !== undefined) dataToUpdate.email = email;
    if (customFields !== undefined) dataToUpdate.customFields = customFields;

    const existingContact = await prisma.contact.findFirst({
      where: { id: contactId, mailingListId: id },
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: dataToUpdate,
    });

    return NextResponse.json(contact);
  } catch (_error: unknown) { const error = _error as Error & { code?: string };
    console.error("Error updating contact:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Another contact with this email already exists in the list" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await prisma.mailingList.findFirst({
      where: { id, userId: user.id },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const existingContact = await prisma.contact.findFirst({
      where: { id: contactId, mailingListId: id },
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    return NextResponse.json({ success: true });
  } catch (_error: unknown) { const error = _error as Error & { code?: string };
    console.error("Error deleting contact:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic'
