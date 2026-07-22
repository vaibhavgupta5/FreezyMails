import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function generateTemplateDraft(context: {
  industry?: string, goal?: string, tone?: 'professional'|'casual'|'bold',
  description?: string, subject?: string, body?: string
}): Promise<{ subject: string, body: string }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  
  const prompt = `You are an expert B2B sales copywriter and cold email strategist. Your objective is to write or improve a cold email template that maximizes open rates and conversions.

Context provided by the user:
- Industry: ${context.industry || 'General'}
- Goal: ${context.goal || 'Outreach'}
- Tone: ${context.tone || 'professional'}
- What the email is about: ${context.description || 'Not specified'}

${context.subject || context.body ? `Existing Draft:
- Subject: ${context.subject || 'None'}
- Body:
${context.body || 'None'}

Please improve the existing draft based on the provided context.` : `Please generate a new cold email based on the context.`}

Instructions:
1. Use {{recipientName}}, {{companyName}}, and {{senderName}} as dynamic variables where natural.
2. Keep the email concise and focused on the goal.
3. Return ONLY a valid JSON object in the exact format: {"subject": "...", "body": "..."} without any markdown formatting or backticks.`;

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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  
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

export async function suggestReply(originalEmail: string, replyReceived: string, instruction?: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  
  const prompt = `I sent this cold email:
${originalEmail}

The prospect replied:
${replyReceived}

${instruction || 'Write a short, natural follow-up reply. Return plain text only.'}`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text().trim()
}
