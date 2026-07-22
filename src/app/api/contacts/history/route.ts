import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const recipients = await prisma.recipient.findMany({
      where: {
        email,
        campaign: { userId: user.id }
      },
      include: {
        campaign: {
          include: {
            template: true,
          }
        },
        mailEvents: {
          orderBy: { occurredAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ history: recipients });
  } catch (_error: unknown) { const error = _error as Error;
    console.error("Error fetching contact history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic'
