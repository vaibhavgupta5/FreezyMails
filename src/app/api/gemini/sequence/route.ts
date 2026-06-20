import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getUser } from '@/lib/supabase'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { icp, offer, tone, steps } = body

  if (!icp || !offer) {
    return NextResponse.json({ error: 'Missing ICP or Offer' }, { status: 400 })
  }

  const numSteps = steps || 3
  const requestedTone = tone || 'professional'

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }) // Use pro for complex multi-step generation

  const prompt = `You are an expert cold email copywriter. Write a ${numSteps}-step cold email sequence.
  
Ideal Customer Profile (ICP): ${icp}
Offer / Value Proposition: ${offer}
Tone: ${requestedTone}

Guidelines:
- Keep the emails concise, highly relevant, and focused on the recipient's pain points.
- Use placeholders like {{firstName}} or {{companyName}} where appropriate.
- Step 1 should introduce the value proposition.
- Subsequent steps should be short follow-ups, adding value or a different angle, not just "bumping" the thread.
- Return the sequence as a valid JSON array of objects. Do not include markdown code block formatting like \`\`\`json. ONLY output the raw JSON array.

Example format:
[
  { "subject": "Quick question about {{companyName}}", "body": "Hi {{firstName}},\\n\\nI noticed..." },
  { "subject": "Re: Quick question about {{companyName}}", "body": "Hi {{firstName}}, following up..." }
]`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    
    // Attempt to parse the raw text, stripping any potential markdown backticks
    let jsonText = text
    if (jsonText.startsWith('```json')) jsonText = jsonText.replace('```json', '')
    if (jsonText.startsWith('```')) jsonText = jsonText.replace('```', '')
    if (jsonText.endsWith('```')) jsonText = jsonText.replace(/```$/, '')
    
    jsonText = jsonText.trim()
    
    const sequence = JSON.parse(jsonText)
    
    if (!Array.isArray(sequence)) {
       throw new Error('Response is not an array')
    }
    
    return NextResponse.json({ sequence })
  } catch (error: any) {
    console.error('Failed to generate sequence:', error)
    return NextResponse.json({ error: 'Failed to generate sequence' }, { status: 500 })
  }
}
