import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { listId } = await req.json();
    if (!listId) {
      return NextResponse.json({ error: "listId is required" }, { status: 400 });
    }

    const list = await prisma.mailingList.findFirst({
      where: { id: listId, userId: user.id },
      include: { contacts: true },
    });

    if (!list) {
      return NextResponse.json({ error: "Mailing list not found" }, { status: 404 });
    }

    if (list.contacts.length === 0) {
      return NextResponse.json({ error: "Mailing list is empty" }, { status: 400 });
    }

    // Import contacts into campaign recipients
    // We ignore duplicates (or we could use createMany with skipDuplicates)
    let importedCount = 0;
    
    // Process in batches or just use createMany
    const data = list.contacts.map((contact) => ({
      campaignId: campaign.id,
      email: contact.email,
      dynamicData: contact.customFields || {},
      status: "PENDING" as const,
    }));

    const result = await prisma.recipient.createMany({
      data,
      skipDuplicates: true, // Requires unique constraint on email+campaignId if one exists.
    });
    
    importedCount = result.count;

    return NextResponse.json({ success: true, importedCount });
  } catch (_error: unknown) { const error = _error as Error;
    console.error("Error importing mailing list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
