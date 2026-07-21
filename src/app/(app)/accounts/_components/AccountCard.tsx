'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { RefreshCcw, ShieldCheck, ShieldAlert, Activity } from 'lucide-react'
import RefreshHealthButton from './RefreshHealthButton'
import DisconnectAccountButton from './DisconnectAccountButton'
import { Button } from '@/components/ui/button'

type AccountProps = {
 acc: {
 id: string
 label: string
 fromEmail: string
 smtpHost: string | null
 healthScore: number
 isActive: boolean
 isWarmupEnabled: boolean
 warmupDay: number
 }
}

export default function AccountCard({ acc: initialAcc }: AccountProps) {
 const [acc, setAcc] = useState(initialAcc)
 const [isHealthLoading, setIsHealthLoading] = useState(false)
 const [domainHealth, setDomainHealth] = useState<any>(null)
 const [isTogglingWarmup, setIsTogglingWarmup] = useState(false)

 let healthColor = "text-green-600"
 if (acc.healthScore < 50) healthColor = "text-danger-text"
 else if (acc.healthScore <= 80) healthColor = "text-warning-text"

 const toggleWarmup = async () => {
 setIsTogglingWarmup(true)
 try {
 const res = await fetch(`/api/accounts/${acc.id}/warmup`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ isWarmupEnabled: !acc.isWarmupEnabled })
 })
 if (!res.ok) throw new Error('Failed to toggle warmup')
 const updated = await res.json()
 setAcc({ ...acc, isWarmupEnabled: updated.isWarmupEnabled })
 toast.success(updated.isWarmupEnabled ? 'Warmup started' : 'Warmup paused')
 } catch (_err: unknown) { const err = _err as Error;
 toast.error(err.message)
 } finally {
 setIsTogglingWarmup(false)
 }
 }

 const checkDomainHealth = async () => {
 setIsHealthLoading(true)
 try {
 const res = await fetch(`/api/accounts/${acc.id}/domain-health`)
 if (!res.ok) throw new Error('Failed to fetch domain health')
 const data = await res.json()
 setDomainHealth(data)
 } catch (_err: unknown) { const err = _err as Error;
 toast.error(err.message)
 } finally {
 setIsHealthLoading(false)
 }
 }

 return (
 <li className="skeu-card flex flex-col space-y-4">
 <div className="flex justify-between items-start">
 <div>
 <h3 className="font-bold text-lg">{acc.label}</h3>
 <p className="text-sm text-text-muted">
 {acc.fromEmail} &bull; {acc.smtpHost || 'Gmail'}
 </p>
 </div>
 <span
 className={`skeu-badge ${acc.isActive ? "bg-bg-subtle border-border-subtle text-ice-800" : "bg-bg-base border-border-subtle text-text-muted"}`}
 >
 {acc.isActive ? "Active" : "Inactive"}
 </span>
 </div>

 {/* Warmup Section - Temporarily Hidden */}
 {/* 
 <div className="bg-bg-subtle p-3 rounded-xl border border-border-subtle flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={`p-2 rounded-lg ${acc.isWarmupEnabled ? 'bg-orange-500/10 text-orange-600' : 'bg-bg-subtle text-text-muted'}`}>
 <Activity size={18} />
 </div>
 <div>
 <div className="text-sm font-semibold">Email Warmup</div>
 <div className="text-xs text-text-muted">
 {acc.isWarmupEnabled ? `Day ${acc.warmupDay} active` : 'Warmup paused'}
 </div>
 </div>
 </div>
 <Button 
 variant={acc.isWarmupEnabled ? "ghost" : "primary"}
 className="text-xs py-1 h-8"
 onClick={toggleWarmup}
 isLoading={isTogglingWarmup}
 >
 {acc.isWarmupEnabled ? 'Pause' : 'Start'}
 </Button>
 </div> 
 */}

 {/* Domain Health Section */}
 <div className="border border-border-subtle rounded-xl overflow-hidden">
 <button 
 onClick={() => !domainHealth && checkDomainHealth()}
 className="w-full bg-bg-subtle p-3 flex items-center justify-between hover:bg-bg-base transition-colors cursor-pointer"
 >
 <div className="flex items-center gap-2 text-sm font-semibold">
 {domainHealth ? <ShieldCheck size={16} className="text-green-500" /> : <ShieldAlert size={16} className="text-text-muted" />}
 Domain Health
 </div>
 {!domainHealth && (
 <span className="text-xs font-medium text-primary-base flex items-center gap-1">
 {isHealthLoading ? <RefreshCcw size={12} className="animate-spin" /> : 'Run Check'}
 </span>
 )}
 </button>

 {domainHealth && (
 <div className="p-3 border-t border-border-subtle bg-bg-base space-y-2 text-xs">
 {['spf', 'dkim', 'dmarc', 'blacklist'].map((checkKey) => {
 const check = domainHealth[checkKey]
 const isPass = check.status === 'pass'
 return (
 <div key={checkKey} className="flex justify-between items-center">
 <span className="uppercase font-semibold text-text-muted w-20">{checkKey}</span>
 <div className="flex-1 flex items-center gap-2">
 <span className={`w-2 h-2 rounded-full ${isPass ? 'bg-green-500' : 'bg-red-500'}`} />
 <span className={`truncate ${isPass ? 'text-green-700' : 'text-danger-text'}`} title={check.message}>
 {check.message}
 </span>
 </div>
 </div>
 )
 })}
 <div className="pt-2 mt-2 border-t border-border-subtle flex justify-end">
 <button onClick={checkDomainHealth} className="text-primary-base font-medium flex items-center gap-1 hover:underline cursor-pointer">
 <RefreshCcw size={12} className={isHealthLoading ? "animate-spin" : ""} /> Refresh
 </button>
 </div>
 </div>
 )}
 </div>

 <div className="pt-2 border-t border-border-subtle flex justify-between items-center">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium">Score:</span>
 <span className={`font-bold ${healthColor}`}>
 {acc.healthScore}/100
 </span>
 {acc.healthScore === 0 && (
 <span
 className="text-xs text-danger-text ml-2"
 title="Bounce rate too high. Review your recipient list."
 >
 (Paused)
 </span>
 )}
 </div>
 <div className="flex items-center gap-2">
 <RefreshHealthButton accountId={acc.id} />
 <DisconnectAccountButton accountId={acc.id} />
 </div>
 </div>
 </li>
 )
}
