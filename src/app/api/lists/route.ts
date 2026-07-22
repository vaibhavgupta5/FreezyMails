import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lists = await prisma.mailingList.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { contacts: true } },
      },
    });

    return NextResponse.json(lists);
  } catch (_error: unknown) { const error = _error as Error;
    console.error("Error fetching mailing lists:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const newList = await prisma.mailingList.create({
      data: {
        userId: user.id,
        name,
      },
    });

    return NextResponse.json(newList);
  } catch (_error: unknown) { const error = _error as Error;
    console.error("Error creating mailing list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic'
