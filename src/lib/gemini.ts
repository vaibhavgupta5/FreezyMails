import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function generateTemplateDraft(context: {
  industry?: string, goal?: string, tone?: 'professional'|'casual'|'bold'
}): Promise<{ subject: string, body: string }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `Write a cold email template for ${context.goal || 'outreach'} in the ${context.industry || 'general'} industry.
Tone: ${context.tone || 'professional'}. 
Use {{recipientName}}, {{companyName}}, {{senderName}} as dynamic variables where natural. 
Return ONLY valid JSON in the exact format: {"subject": "...", "body": "..."}`

  const result = await model.generateContent(prompt)
  const response = await result.response
  let text = response.text()
  
  text = text.replace(/```json/g, '').replace(/```/g, '').trim()
  
  try {
    return JSON.parse(text)
  } catch (err) {
    return { subject: 'Error', body: 'Failed to parse JSON from AI response.' }
  }
}

export async function generateSubjectVariants(currentSubject: string, count: number = 3): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `Generate ${count} alternative subject lines for this cold email subject: '${currentSubject}'. 
Return ONLY a valid JSON array of strings, for example: ["subject 1", "subject 2"].`

  const result = await model.generateContent(prompt)
  const response = await result.response
  let text = response.text()
  
  text = text.replace(/```json/g, '').replace(/```/g, '').trim()
  
  try {
    return JSON.parse(text)
  } catch (err) {
    return [currentSubject]
  }
}

export async function suggestReply(originalEmail: string, replyReceived: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `I sent this cold email:
${originalEmail}

The prospect replied:
${replyReceived}

Write a short, natural follow-up reply. Return plain text only.`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text().trim()
}
