import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import AccountForm from "./_components/AccountForm";
import AccountCard from "./_components/AccountCard";
import { Server } from "lucide-react";

export default async function AccountsPage() {
 const user = await getUser();
 if (!user) return null;

 const accounts = await prisma.emailAccount.findMany({
 where: { userId: user.id },
 select: {
 id: true,
 label: true,
 fromEmail: true,
 smtpHost: true,
 healthScore: true,
 isActive: true,
 isWarmupEnabled: true,
 warmupDay: true,
 },
 orderBy: { createdAt: "desc" },
 });

 return (
 <div className="skeu-page">
 <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
 <div className="flex justify-between items-center mb-4">
 <h1 className="text-xl font-semibold text-text-primary">Email Accounts</h1>
 </div>

 <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
 <div>
 <h2 className="text-xl font-semibold mb-4">Your Accounts</h2>
 {accounts.length === 0 ? (
 <div className="skeu-card text-center p-12 space-y-4">
 <Server className="mx-auto text-text-muted" size={48} />
 <p className="text-text-muted">No accounts added yet.</p>
 </div>
 ) : (
 <ul className="space-y-4">
 {accounts.map((acc) => (
 <AccountCard key={acc.id} acc={acc} />
 ))}
 </ul>
 )}
 </div>

 <div>
 <h2 className="text-xl font-semibold mb-4">Add Account</h2>
 <div className="skeu-card">
 <AccountForm />
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
