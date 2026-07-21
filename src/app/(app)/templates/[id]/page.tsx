import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import TemplateForm from "../_components/TemplateForm";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default async function EditTemplatePage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const user = await getUser();
 if (!user) redirect("/login");

 const template = await prisma.template.findUnique({
 where: { id, userId: user.id },
 });

 if (!template) {
 redirect("/templates");
 }

 return (
 <div className="skeu-page">
 <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
 <div className="flex items-center gap-4 mb-4">
 <Link
 href="/templates"
 className="text-text-muted hover:text-text-primary transition-colors bg-white p-2 rounded-full -skeu-raised hover: -skeu-pressed"
 >
 <ChevronLeft size={20} />
 </Link>
 <h1 className="text-xl font-semibold text-text-primary">Edit Template</h1>
 </div>

 <TemplateForm initialData={template} />
 </div>
 </div>
 );
}
