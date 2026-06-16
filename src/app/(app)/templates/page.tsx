import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import Link from "next/link";
import TemplateList from "./_components/TemplateList";

export default async function TemplatesPage() {
  const user = await getUser();
  if (!user) return null;

  const templates = await prisma.template.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Link href="/templates/new" className="skeu-btn-primary">
          New Template
        </Link>
      </div>

      <TemplateList initialTemplates={templates} />
    </div>
  );
}
