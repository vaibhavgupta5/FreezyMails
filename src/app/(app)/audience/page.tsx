"use client";

import { useEffect, useState } from "react";
import { Users, Trash2, Search, Edit2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import ConfirmPopup from "@/components/ui/ConfirmPopup";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from "@/components/ui/skeleton";

type MailingList = {
 id: string;
 name: string;
 createdAt: string;
 _count: { contacts: number };
};

export default function AudiencePage() {
 const router = useRouter();
 const [lists, setLists] = useState<MailingList[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState("");
 const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<string | null>(null);
 
 const fetchLists = async () => {
 try {
 const res = await fetch("/api/lists");
 if (!res.ok) throw new Error("Failed to fetch");
 const data = await res.json();
 setLists(data);
 } catch (err) {
 toast.error("Failed to load mailing lists");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchLists();
 }, []);

 const deleteList = async (id: string) => {
 try {
 const res = await fetch(`/api/lists/${id}`, { method: "DELETE" });
 if (!res.ok) throw new Error("Failed to delete list");
 toast.success("List deleted!");
 fetchLists();
 } catch (err) {
 toast.error("Error deleting list");
 } finally {
 setDeleteConfirmTarget(null);
 }
 };

 const filteredLists = lists.filter(l => 
 l.name.toLowerCase().includes(search.toLowerCase())
 );

 return (
 <div className="skeu-page h-[100dvh] overflow-y-auto w-full">
 <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
 
 <div className="flex justify-between items-center mb-4">
 <h1 className="text-xl font-semibold text-text-primary">Mailing Lists</h1>
 <Link href="/audience/new" className="skeu-btn-primary">
 New Mailing List
 </Link>
 </div>

 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div className="relative flex-1 max-w-md">
 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
 <Input 
 type="text"
 placeholder="Search mailing lists..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="skeu-input pl-10"
 />
 </div>
 </div>

 {loading ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {[...Array(6)].map((_, i) => (
 <div key={i} className="skeu-card h-32 flex flex-col justify-between">
 <div className="space-y-2">
 <Skeleton className="h-5 w-3/4" />
 <Skeleton className="h-4 w-1/3" />
 </div>
 <div>
 <div className="skeu-divider mb-3 mt-4" />
 <Skeleton className="h-4 w-1/4" />
 </div>
 </div>
 ))}
 </div>
 ) : filteredLists.length === 0 ? (
 <div className="skeu-card flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
 <Users size={64} className="text-text-muted opacity-50" />
 <div>
 <h3 className="text-lg font-semibold text-text-primary">
 No mailing lists found
 </h3>
 <p className="text-text-muted mt-1">
 {search ? 'Try adjusting your search.' : 'Create your first mailing list to start adding contacts.'}
 </p>
 </div>
 {!search && (
 <Link href="/audience/new" className="skeu-btn-primary mt-4">
 Create Mailing List
 </Link>
 )}
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <TooltipProvider>
 {filteredLists.map((list) => (
 <div 
 key={list.id} 
 className="skeu-card flex flex-col justify-between group cursor-pointer hover:border-border-subtle transition-colors"
 onClick={() => router.push(`/audience/${list.id}`)}
 >
 <div>
 <div className="flex justify-between items-start mb-1">
 <h3 className="font-bold text-lg text-text-primary truncate pr-2">{list.name}</h3>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button 
 variant="none"
 onClick={(e) => {
 e.stopPropagation();
 setDeleteConfirmTarget(list.id);
 }}
 className="text-text-muted hover:text-danger-text transition-colors opacity-0 group-hover:opacity-100 h-auto p-1 -m-1"
 >
 <Trash2 size={16} />
 </Button>
 </TooltipTrigger>
 <TooltipContent>Delete mailing list</TooltipContent>
 </Tooltip>
 </div>
 <p className="text-sm text-text-muted truncate">{list._count.contacts} contacts</p>
 </div>
 <div>
 <div className="skeu-divider mt-4 mb-3" />
 <div className="flex justify-between items-center text-xs text-text-muted">
 <span>{new Date(list.createdAt).toLocaleDateString()}</span>
 <div className="flex gap-3">
 <span className="text-primary-base font-medium flex items-center gap-1 group-hover:underline">
 <Edit2 size={12} /> View Details
 </span>
 </div>
 </div>
 </div>
 </div>
 ))}
 </TooltipProvider>
 </div>
 )}
 </div>
 </div>

 <ConfirmPopup
 isOpen={deleteConfirmTarget !== null}
 onClose={() => setDeleteConfirmTarget(null)}
 onConfirm={() => deleteConfirmTarget && deleteList(deleteConfirmTarget)}
 title="Delete this mailing list?"
 description="This will permanently remove the mailing list and all its contacts. This action cannot be undone."
 confirmText="Delete Mailing List"
 />
 </div>
 );
}
