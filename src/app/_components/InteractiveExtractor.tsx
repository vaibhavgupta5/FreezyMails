"use client";

import { useState, useLayoutEffect } from 'react';
import { Terminal, CheckCircle2, AlertCircle, Loader2, Search, Building2, User, Mail, Database } from "lucide-react";

interface ExtractionResult {
  companyName: string;
  personName?: string;
  email?: string;
  allEmails?: string[];
}

export default function InteractiveExtractor() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);

  useLayoutEffect(() => {
    // Check local storage on mount asynchronously to avoid cascading renders
    const checkLimit = async () => {
      const lastUse = localStorage.getItem("freezymails_last_extraction_date");
      const today = new Date().toISOString().split("T")[0];
      if (lastUse === today) {
        setLimitReached(true);
      }
    };
    
    checkLimit();
  }, []);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    // Check limit
    const today = new Date().toISOString().split("T")[0];
    const lastUse = localStorage.getItem("freezymails_last_extraction_date");
    if (lastUse === today) {
      setLimitReached(true);
      setError("Limit reached: You can try again tomorrow or sign up for free!");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/public/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to extract");
      }

      setResult(data.extracted);
      
      // Update local storage limit
      localStorage.setItem("freezymails_last_extraction_date", today);
      setLimitReached(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-bg-base rounded-lg border border-border-subtle shadow-[0_0_15px_rgba(0,0,0,0.2)] flex flex-col font-mono text-[10px] sm:text-xs overflow-hidden min-h-[250px] sm:h-[250px]">
      {/* Header */}
      <div className="h-8 border-b border-border-subtle bg-bg-subtle flex items-center justify-between px-3 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]"></div>
        </div>
        <div className="text-text-muted flex items-center gap-2">
          <Terminal size={14} /> live_extractor.js
        </div>
        <div className="w-10"></div>
      </div>
      
      {/* Body */}
      <div className="p-4 flex flex-col gap-4 flex-1 bg-bg-base text-text-primary relative overflow-hidden">
        
        {/* Input Form */}
        <form onSubmit={handleExtract} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="e.g. ycombinator.com" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-bg-subtle border border-border-subtle rounded px-9 py-2 text-text-primary outline-none focus:border-primary-base focus:ring-1 focus:ring-primary-base transition-all placeholder:text-text-muted"
              disabled={loading || (limitReached && !result && !error)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !url || (limitReached && !result && !error)}
            className="bg-text-primary text-bg-base px-4 py-2 rounded hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all flex items-center justify-center gap-2 min-w-[70px]"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Run"}
          </button>
        </form>

        {limitReached && !result && !error && (
           <div className="text-text-muted text-center mt-4">
             {"You've used your free demo for today."} <br/>
             <a href="/login" className="text-primary-base hover:underline mt-1 inline-block">Sign up to extract unlimited</a>
           </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-[#F85149] mt-2 bg-[#F85149]/10 p-3 rounded border border-[#F85149]/20">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Output */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="flex flex-col gap-2 mt-4">
               <div className="flex items-center gap-2 text-text-muted">
                 <Loader2 size={14} className="animate-spin" />
                 <span>Scraping {url}...</span>
               </div>
               <div className="pl-6 text-primary-base opacity-70 animate-pulse">Scanning pages for emails...</div>
            </div>
          )}

          {result && (
            <div className="mt-2 space-y-3 pb-2">
              <div className="flex items-center gap-2 text-success-text">
                <CheckCircle2 size={14} /> 
                <span>Extraction Complete!</span>
              </div>
              <div className="bg-bg-subtle border border-border-subtle rounded-md p-3 font-sans shadow-inner">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-bg-base border border-border-subtle flex items-center justify-center shrink-0 text-text-primary">
                      <Building2 size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold leading-tight">Company</span>
                      <span className="text-text-primary font-medium text-xs leading-tight">{result.companyName}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-bg-base border border-border-subtle flex items-center justify-center shrink-0 text-text-primary">
                      <User size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold leading-tight">Contact</span>
                      <span className="text-text-primary font-medium text-xs leading-tight">{result.personName || "Unknown"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-bg-base border border-border-subtle flex items-center justify-center shrink-0 text-text-primary">
                      <Mail size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold leading-tight">Best Email</span>
                      <span className="text-primary-base font-medium text-xs leading-tight">{result.email || "Not found"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-bg-base border border-border-subtle flex items-center justify-center shrink-0 text-text-primary">
                      <Database size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold leading-tight">Total Found</span>
                      <span className="text-success-text font-medium text-xs leading-tight">{result.allEmails?.length || 0} emails</span>
                    </div>
                  </div>
                </div>
              </div>
              {limitReached && (
                 <div className="text-center mt-2 text-text-muted text-[10px]">
                   <a href="/login" className="text-primary-base hover:underline inline-block">Sign up to extract your whole list</a>
                 </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
