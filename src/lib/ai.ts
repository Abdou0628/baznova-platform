/**
 * HireNova — AI Backend Utility (Dual-Mode)
 *
 * Handles graceful fallback between:
 *   1. Z.ai SDK (z-ai-web-dev-sdk) — available only in Z.ai environment
 *   2. OpenAI API — for localhost (requires OPENAI_API_KEY in .env.local)
 *
 * All imports are DYNAMIC to avoid crashing on localhost.
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResult {
  text: string
  source: 'zai' | 'openai'
}

/**
 * Call LLM (chat completion) with automatic fallback.
 * Tries Z.ai SDK first, then OpenAI API.
 */
export async function callLLM(
  messages: AIMessage[],
  options?: { model?: string; temperature?: number; max_tokens?: number }
): Promise<LLMResult | null> {
  const { temperature = 0.7, max_tokens = 2000 } = options || {}

  // 1) Try Z.ai SDK
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const res = await zai.chat.completions.create({
      model: options?.model || 'deepseek-chat',
      messages: messages as any,
      temperature,
      max_tokens,
    })
    const text = res.choices?.[0]?.message?.content?.trim()
    if (text) return { text, source: 'zai' }
  } catch (err) {
    console.log('[AI] Z.ai SDK unavailable, trying OpenAI...')
  }

  // 2) Try OpenAI
  try {
    const key = process.env.OPENAI_API_KEY
    if (!key || key === 'sk-your-key-here') return null

    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: key })
    const res = await openai.chat.completions.create({
      model: options?.model || 'gpt-4o-mini',
      messages: messages as any,
      temperature,
      max_tokens,
    })
    const text = res.choices?.[0]?.message?.content?.trim()
    if (text) return { text, source: 'openai' }
  } catch (err) {
    console.error('[AI] OpenAI error:', err instanceof Error ? err.message : String(err))
  }

  return null
}

/**
 * Generate TTS audio with automatic fallback.
 * Tries Z.ai SDK first, then OpenAI TTS.
 */
export async function callTTS(
  text: string,
  options?: {
    language?: string
    gender?: 'male' | 'female'
    voice?: string
  }
): Promise<{ audio: Buffer; contentType: string; source: 'zai' | 'openai' } | null> {
  // 1) Try Z.ai SDK
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const lang = (options?.language || 'fr') as 'fr' | 'en' | 'ar' | 'es'
    const gender = options?.gender || 'female'
    const voiceMap: Record<string, Record<string, string>> = {
      fr: { female: 'tongtong', male: 'jam' },
      en: { female: 'tongtong', male: 'jam' },
      es: { female: 'tongtong', male: 'jam' },
      ar: { female: 'kazi', male: 'douji' },
    }
    const voice = options?.voice || voiceMap[lang]?.[gender] || 'tongtong'

    const response = await zai.audio.tts.create({
      input: text,
      voice,
      speed: lang === 'ar' ? 0.85 : 1.0,
      response_format: 'wav',
      stream: false,
    })
    const buffer = Buffer.from(new Uint8Array(await response.arrayBuffer()))
    if (buffer.length > 0) return { audio: buffer, contentType: 'audio/wav', source: 'zai' }
  } catch (err) {
    console.log('[AI] Z.ai TTS unavailable, trying OpenAI...')
  }

  // 2) Try OpenAI TTS
  try {
    const key = process.env.OPENAI_API_KEY
    if (!key || key === 'sk-your-key-here') return null

    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: key })
    const voice = options?.voice || (options?.gender === 'male' ? 'onyx' : 'nova')

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      response_format: 'mp3',
    })
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > 0) return { audio: buffer, contentType: 'audio/mp3', source: 'openai' }
  } catch (err) {
    console.error('[AI] OpenAI TTS error:', err instanceof Error ? err.message : String(err))
  }

  return null
}

/**
 * Check if any AI backend is available.
 */
export async function isAIAvailable(): Promise<'zai' | 'openai' | 'none'> {
  // Check Z.ai
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    await ZAI.create()
    return 'zai'
  } catch {}

  // Check OpenAI
  const key = process.env.OPENAI_API_KEY
  if (key && key !== 'sk-your-key-here') return 'openai'

  return 'none'
}
