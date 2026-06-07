'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { validateRecipientList } from '@/lib/validate'
import { AlertTriangle, Check, Trash2, Plus, Type, Table as TableIcon } from 'lucide-react'
import PageSkeleton from '../../_components/PageSkeleton'
import { useCampaignStore } from '@/stores/useCampaignStore'

export default function NewCampaignPage() {
  const router = useRouter()
  const { 
    step, setStep, 
    inputMode, setInputMode, 
    name, templateId, accountId, setDetails,
    recipientsText, setRecipientsText,
    parsedRecipients, validationErrors, isValid, globalError,
    resetDraft
  } = useCampaignStore()

  const [templates, setTemplates] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const selectedTemplate = templates.find(t => t.id === templateId)
  const requiredHeaders = selectedTemplate ? ['email', ...(selectedTemplate.variables || [])] : ['email']

  useEffect(() => {
    Promise.all([
      fetch('/api/templates').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json())
    ]).then(([tData, aData]) => {
      setTemplates(tData || [])
      setAccounts(aData || [])
      setLoading(false)
    })
  }, [])

  const getTableRows = () => {
    let lines = recipientsText.split('\n').filter(l => l !== '')
    if (lines.length > 0 && lines[0].toLowerCase().startsWith('email')) lines = lines.slice(1)
    if (lines.length === 0) return [{}]
    
    const delimiter = lines[0].includes('\t') ? '\t' : ','
    return lines.map(line => {
      const vals = line.split(delimiter)
      const obj: any = {}
      requiredHeaders.forEach((h, i) => {
        obj[h] = vals[i] || ''
      })
      return obj
    })
  }

  const handleTableChange = (rowIndex: number, header: string, value: string) => {
    const rows = getTableRows()
    rows[rowIndex][header] = value
    const newText = rows.map(r => requiredHeaders.map(h => r[h] || '').join('\t')).join('\n')
    setRecipientsText(newText, templates)
  }

  const handleAddRow = () => {
    const rows = getTableRows()
    rows.push({})
    const newText = rows.map(r => requiredHeaders.map(h => r[h] || '').join('\t')).join('\n')
    setRecipientsText(newText, templates)
  }

  const handleRemoveRow = (rowIndex: number) => {
    const rows = getTableRows()
    rows.splice(rowIndex, 1)
    const newText = rows.map(r => requiredHeaders.map(h => r[h] || '').join('\t')).join('\n')
    setRecipientsText(newText, templates)
  }

  const handleCreate = async () => {
    if (!name || !templateId || !accountId || !isValid) return
    
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        templateId,
        emailAccountId: accountId,
        recipients: parsedRecipients
      })
    })

    if (res.ok) {
      const { id } = await res.json()
      resetDraft()
      router.push(`/campaigns/${id}`)
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Campaign</h1>
      
      <div className="flex gap-4 mb-8">
        <div className={`flex-1 p-3 text-center border-b-2 font-medium ${step === 1 ? 'border-ice-500 text-ice-700' : 'border-transparent text-surface-400'}`}>1. Details</div>
        <div className={`flex-1 p-3 text-center border-b-2 font-medium ${step === 2 ? 'border-ice-500 text-ice-700' : 'border-transparent text-surface-400'}`}>2. Recipients</div>
      </div>

      {step === 1 && (
        <div className="skeu-card space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Campaign Name</label>
            <input className="skeu-input" value={name} onChange={e => setDetails(e.target.value, templateId, accountId)} placeholder="Q3 Outreach" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email Account</label>
            <select className="skeu-select" value={accountId} onChange={e => setDetails(name, templateId, e.target.value)}>
              <option value="">Select Account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.label} ({a.fromEmail})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Template</label>
            <select className="skeu-select" value={templateId} onChange={e => setDetails(name, e.target.value, accountId)}>
              <option value="">Select Template</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="pt-4 flex justify-end">
            <button 
              className="skeu-btn-primary" 
              onClick={() => setStep(2)} 
              disabled={!name || !templateId || !accountId}
            >
              Next Step
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="skeu-card relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Enter Recipients</h2>
                <div className="flex gap-2 mb-4 bg-surface-100 p-1 rounded inline-flex">
                  <button 
                    className={`px-4 py-2 text-sm font-medium rounded flex items-center gap-2 transition ${inputMode === 'table' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-700'}`}
                    onClick={() => setInputMode('table')}
                  >
                    <TableIcon size={16} /> Table Form
                  </button>
                  <button 
                    className={`px-4 py-2 text-sm font-medium rounded flex items-center gap-2 transition ${inputMode === 'paste' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-700'}`}
                    onClick={() => setInputMode('paste')}
                  >
                    <Type size={16} /> Bulk Paste
                  </button>
                </div>
                {inputMode === 'paste' && <p className="text-sm text-surface-600 mb-4">Copy and paste data directly from Excel or Google Sheets. The columns must match the order below.</p>}
                
                <div className="mb-2">
                  <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 block">Required Column Order</span>
                  <div className="flex gap-2 flex-wrap">
                    {requiredHeaders.map(h => (
                      <span key={h} className="bg-ice-100 text-ice-800 border border-ice-200 px-3 py-1 rounded text-sm font-mono shadow-sm">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
                <button 
                  onClick={() => setRecipientsText('', templates)} 
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1 border border-red-200 rounded hover:bg-red-50 transition mt-1"
                >
                Clear Data
              </button>
            </div>
            
            {inputMode === 'paste' ? (
              <textarea 
                className="skeu-textarea w-full font-mono text-sm whitespace-pre" 
                rows={10}
                value={recipientsText} 
                onChange={e => setRecipientsText(e.target.value, templates)} 
                placeholder="john@example.com&#9;John&#9;Acme Corp&#10;sarah@example.com&#9;Sarah&#9;Globex"
              />
            ) : (
              <div className="border border-surface-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-100 border-b border-surface-200">
                    <tr>
                      {requiredHeaders.map(h => <th key={h} className="p-3 text-xs font-semibold text-surface-600 uppercase">{h}</th>)}
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTableRows().map((row, i) => (
                      <tr key={i} className="border-b border-surface-100 last:border-0 hover:bg-surface-50">
                        {requiredHeaders.map(h => (
                          <td key={h} className="p-2">
                            <input 
                              type="text" 
                              className="w-full p-2 border border-transparent hover:border-surface-200 focus:border-ice-500 rounded bg-transparent focus:bg-white transition-colors text-sm"
                              placeholder={`Enter ${h}`}
                              value={row[h] || ''}
                              onChange={(e) => handleTableChange(i, h, e.target.value)}
                            />
                          </td>
                        ))}
                        <td className="p-2 text-center">
                          <button onClick={() => handleRemoveRow(i)} className="text-surface-400 hover:text-red-500 p-1">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-surface-50 border-t border-surface-200">
                  <button onClick={handleAddRow} className="flex items-center gap-1 text-sm font-medium text-ice-600 hover:text-ice-700">
                    <Plus size={16} /> Add Row
                  </button>
                </div>
              </div>
            )}
          </div>

          {parsedRecipients.length > 0 && (
            <div className="skeu-card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Preview & Validation</h2>
                {isValid ? (
                  <span className="flex items-center text-sm font-medium text-green-600 gap-1"><Check size={16}/> Ready to send</span>
                ) : (
                  <span className="flex items-center text-sm font-medium text-red-600 gap-1"><AlertTriangle size={16}/> {globalError}</span>
                )}
              </div>
              
              <div className="overflow-x-auto max-h-96">
                <table className="skeu-table">
                  <thead className="sticky top-0 bg-surface-100 z-10">
                    <tr>
                      {Object.keys(parsedRecipients[0] || {}).map(k => <th key={k}>{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRecipients.map((row, i) => {
                      const hasErr = !!validationErrors[i]
                      const errs = validationErrors[i] || []
                      const isDup = errs.some(e => e.includes('Duplicate'))
                      
                      let rowClass = ""
                      if (hasErr) {
                        rowClass = isDup ? "border-l-4 border-amber-500 bg-amber-50" : "border-l-4 border-red-500 bg-red-50"
                      }
                      
                      return (
                        <tr key={i} className={rowClass} title={errs.join(' | ')}>
                          {Object.keys(row).map(k => (
                            <td key={k} className={hasErr ? 'text-red-900' : ''}>{row[k]}</td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button className="skeu-btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="skeu-btn-primary" onClick={handleCreate} disabled={!isValid}>Create Campaign</button>
          </div>
        </div>
      )}
    </div>
  )
}
