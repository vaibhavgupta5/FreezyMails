import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";

export async function POST(
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

    const { email, customFields } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        mailingListId: id,
        email,
        customFields: customFields || {},
      },
    });

    return NextResponse.json(contact);
  } catch (_error: unknown) { const error = _error as Error & { code?: string };
    console.error("Error creating contact:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Contact with this email already exists in the list" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic'
