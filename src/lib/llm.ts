/**
 * HireNova LLM Helper — Unified interface to z-ai-web-dev-sdk
 * Used server-side only for AI-powered features.
 */
let zaiInstance: ReturnType<typeof import('z-ai-web-dev-sdk').default.create> | null = null
let sdkAvailable: boolean | null = null

async function getZAI() {
  if (sdkAvailable === false) throw new Error('ZAI SDK unavailable')
  if (!zaiInstance) {
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      zaiInstance = await ZAI.create()
      sdkAvailable = true
    } catch (err) {
      sdkAvailable = false
      throw new Error('ZAI SDK unavailable')
    }
  }
  return zaiInstance
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  model?: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

/**
 * Send a chat completion request to the LLM.
 */
export async function chatCompletion(params: {
  messages: LLMMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
}): Promise<LLMResponse> {
  try {
    const zai = await getZAI()
    const result = await zai.chat.completions.create({
      messages: params.messages,
      model: params.model || 'deepseek-chat',
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens || 2000,
    })

    const choice = result?.choices?.[0]
    if (!choice?.message?.content) {
      throw new Error('No response from LLM')
    }

    return {
      content: choice.message.content,
      model: result.model,
      usage: result.usage,
    }
  } catch (error) {
    console.error('[llm] Chat completion failed:', error)
    throw error
  }
}

/**
 * Send a chat completion and parse JSON from the response.
 */
export async function chatCompletionJSON<T>(params: {
  messages: LLMMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
}): Promise<T> {
  const response = await chatCompletion({
    ...params,
    temperature: params.temperature ?? 0.3, // lower temp for structured output
  })

  // Try to extract JSON from the response
  const jsonMatch = response.content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in LLM response')
  }

  return JSON.parse(jsonMatch[0]) as T
}
