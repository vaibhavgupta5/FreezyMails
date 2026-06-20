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
    <div className="skeu-page">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-text-primary">Templates</h1>
          <Link href="/templates/new" className="skeu-btn-primary">
            New Template
          </Link>
        </div>

        <TemplateList initialTemplates={templates} />
      </div>
    </div>
  );
}
