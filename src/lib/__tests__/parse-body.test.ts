import { parseBody } from '@/lib/parse-body'

describe('parseBody', () => {
  it('returns parsed object for valid JSON body', async () => {
    const body = { name: 'John', age: 30 }
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const result = await parseBody(request)
    expect(result).toEqual(body)
  })

  it('returns null for invalid JSON', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: '{not valid json}',
      headers: { 'Content-Type': 'application/json' },
    })
    const result = await parseBody(request)
    expect(result).toBeNull()
  })

  it('returns null for empty body', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: '',
      headers: { 'Content-Type': 'application/json' },
    })
    const result = await parseBody(request)
    expect(result).toBeNull()
  })

  it('returns null when body has already been consumed', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'application/json' },
    })
    // Consume the body first
    await request.text()
    const result = await parseBody(request)
    expect(result).toBeNull()
  })
})
