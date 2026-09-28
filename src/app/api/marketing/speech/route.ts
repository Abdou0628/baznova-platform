/**
 * HireNova — AI Speech (TTS) Generator
 *
 * POST /api/marketing/speech
 *
 * Dual-mode TTS:
 *   Z.ai env → z-ai-web-dev-sdk (free)
 *   Localhost → OpenAI TTS API (OPENAI_API_KEY in .env.local)
 *   Fallback  → Browser SpeechSynthesis (client-side)
 */

import { NextRequest, NextResponse } from 'next/server'

// ===== Types =====

type CVLanguage = 'fr' | 'en' | 'ar' | 'es'

interface SpeechRequest {
  text: string
  language: CVLanguage
  gender: 'male' | 'female'
}

// ===== Constants =====

// Z.ai SDK voice mapping
const ZAI_VOICE_BY_LANG_GENDER: Record<CVLanguage, Record<'male' | 'female', string>> = {
  fr: { female: 'tongtong', male: 'jam' },
  en: { female: 'tongtong', male: 'jam' },
  es: { female: 'tongtong', male: 'jam' },
  ar: { female: 'kazi', male: 'douji' },
}

// OpenAI TTS voice mapping
const OPENAI_VOICE: Record<'male' | 'female', string> = {
  female: 'nova',
  male: 'onyx',
}

const MAX_TTS_CHARS = 1000

function splitTextIntoChunks(text: string, maxLength = MAX_TTS_CHARS): string[] {
  const chunks: string[] = []
  const sentences = text.match(/[^.!؟?\n]+[.!؟?\n]+/g) || [text]

  let currentChunk = ''
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence
    } else {
      if (currentChunk) chunks.push(currentChunk.trim())
      if (sentence.length > maxLength) {
        const words = sentence.split(' ')
        currentChunk = ''
        for (const word of words) {
          if ((currentChunk + ' ' + word).length > maxLength) {
            if (currentChunk) chunks.push(currentChunk.trim())
            currentChunk = word
          } else {
            currentChunk += (currentChunk ? ' ' : '') + word
          }
        }
      } else {
        currentChunk = sentence
      }
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim())
  return chunks
}

// ===== TTS Backends =====

/** Try Z.ai SDK TTS */
async function ttsWithZAI(text: string, language: CVLanguage, gender: 'male' | 'female'): Promise<Buffer | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const voiceName = ZAI_VOICE_BY_LANG_GENDER[language]?.[gender] || 'kazi'
    const chunks = splitTextIntoChunks(text)
    const audioBuffers: Buffer[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`[TTS Z.ai] Chunk ${i + 1}/${chunks.length} (${chunk.length} chars, voice=${voiceName})`)
      const response = await zai.audio.tts.create({
        input: chunk,
        voice: voiceName,
        speed: language === 'ar' ? 0.85 : 1.0,
        response_format: 'wav',
        stream: false,
      })
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(new Uint8Array(arrayBuffer))
      console.log(`[TTS Z.ai] Chunk ${i + 1} audio: ${buffer.length} bytes`)
      audioBuffers.push(buffer)
    }

    if (audioBuffers.length === 1) return audioBuffers[0]

    // Concatenate WAV chunks
    const WAV_HEADER_SIZE = 44
    const header = audioBuffers[0].subarray(0, WAV_HEADER_SIZE)
    const pcmParts = audioBuffers.map((buf) => buf.subarray(WAV_HEADER_SIZE))
    const totalPCMSize = pcmParts.reduce((sum, p) => sum + p.length, 0)
    const updatedHeader = Buffer.from(header)
    updatedHeader.writeUInt32LE(36 + totalPCMSize, 4)
    updatedHeader.writeUInt32LE(totalPCMSize, 40)
    return Buffer.concat([updatedHeader, ...pcmParts])
  } catch (err) {
    console.log('[TTS Z.ai] SDK unavailable:', err instanceof Error ? err.message : String(err))
    return null
  }
}

/** Try OpenAI TTS API */
async function ttsWithOpenAI(text: string, language: CVLanguage, gender: 'male' | 'female'): Promise<Buffer | null> {
  try {
    const key = process.env.OPENAI_API_KEY
    if (!key || key === 'sk-your-key-here') return null

    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: key })
    const voice = OPENAI_VOICE[gender] || 'nova'

    console.log(`[TTS OpenAI] lang=${language} gender=${gender} voice=${voice} textLen=${text.length}`)
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
      response_format: 'mp3',
    })
    const buffer = Buffer.from(await response.arrayBuffer())
    console.log(`[TTS OpenAI] audio: ${buffer.length} bytes`)
    return buffer
  } catch (err) {
    console.error('[TTS OpenAI] Error:', err instanceof Error ? err.message : String(err))
    return null
  }
}

// ===== Route Handler =====

export async function POST(request: NextRequest) {
  try {
    const body: SpeechRequest = await request.json()
    const { text, language, gender = 'female' } = body

    if (!text || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: text and language' },
        { status: 400 }
      )
    }

    const validLanguages: CVLanguage[] = ['fr', 'en', 'ar', 'es']
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: `Invalid language: ${language}` },
        { status: 400 }
      )
    }

    const trimmedText = text.trim()
    if (trimmedText.length === 0) {
      return NextResponse.json(
        { error: 'Text cannot be empty' },
        { status: 400 }
      )
    }

    console.log(`[/api/marketing/speech] lang=${language} gender=${gender} textLen=${trimmedText.length}`)

    // 1) Try Z.ai SDK first
    let audioBuffer = await ttsWithZAI(trimmedText, language, gender)
    let contentType = 'audio/wav'

    // 2) Fallback to OpenAI TTS
    if (!audioBuffer) {
      console.log('[/api/marketing/speech] Z.ai SDK failed, trying OpenAI TTS...')
      audioBuffer = await ttsWithOpenAI(trimmedText, language, gender)
      contentType = 'audio/mp3'
    }

    // 3) No backend available
    if (!audioBuffer) {
      return NextResponse.json(
        { error: 'TTS_UNAVAILABLE', message: 'No TTS backend available. Set OPENAI_API_KEY in .env.local for localhost.' },
        { status: 503 }
      )
    }

    console.log(`[/api/marketing/speech] Success: ${audioBuffer.length} bytes (${contentType})`)

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('[/api/marketing/speech] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
