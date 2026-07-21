import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await prisma.mailingList.findFirst({
      where: { id, userId: user.id },
      include: {
        contacts: {
          orderBy: { createdAt: "desc" }
        }
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Determine sent status for each contact
    const emails = list.contacts.map((c: { email: string }) => c.email).filter(Boolean);
    const emailStatusMap: Record<string, string> = {};

    if (emails.length > 0) {
      const recipients = await prisma.recipient.findMany({
        where: {
          email: { in: emails },
          campaign: { userId: user.id }
        },
        select: {
          email: true,
          status: true
        }
      });

      // Map statuses. Prioritize 'SENT', then 'PENDING', etc.
      recipients.forEach(r => {
        const current = emailStatusMap[r.email];
        if (r.status === "SENT" || current === "SENT") {
          emailStatusMap[r.email] = "SENT";
        } else if (r.status === "PENDING" || current === "PENDING") {
          emailStatusMap[r.email] = "PENDING";
        } else if (r.status === "FAILED" || current === "FAILED") {
          emailStatusMap[r.email] = "FAILED";
        } else if (r.status === "BOUNCED" || current === "BOUNCED") {
          emailStatusMap[r.email] = "BOUNCED";
        }
      });
    }

    const contactsWithStatus = list.contacts.map((c: { id: string; email: string; customFields: unknown }) => ({
      ...c,
      sentStatus: emailStatusMap[c.email] || "NOT_SENT"
    }));

    return NextResponse.json({ ...list, contacts: contactsWithStatus });
  } catch (_error: unknown) { const error = _error as Error;
    console.error("Error fetching mailing list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();

    const list = await prisma.mailingList.updateMany({
      where: { id, userId: user.id },
      data: { name },
    });

    if (list.count === 0) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (_error: unknown) { const error = _error as Error;
    console.error("Error updating mailing list:", error);
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

    const list = await prisma.mailingList.deleteMany({
      where: { id, userId: user.id },
    });

    if (list.count === 0) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (_error: unknown) { const error = _error as Error;
    console.error("Error deleting mailing list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
