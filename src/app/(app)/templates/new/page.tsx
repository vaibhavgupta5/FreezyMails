import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import TemplateForm from "../_components/TemplateForm";

export default function NewTemplatePage() {
  return (
    <div className="skeu-page">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/templates"
            className="text-text-muted hover:text-black transition-colors bg-white p-2 rounded-full -skeu-raised hover: -skeu-pressed"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-text-primary">
            Create New Template
          </h1>
        </div>

        <TemplateForm />
      </div>
    </div>
  );
}
