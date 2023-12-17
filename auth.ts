import { IRequest, error } from 'itty-router'
import { verifyMessage } from 'viem'
import { Env } from '.'
import { z } from 'zod'

export async function withAuth(request: IRequest, env: Env) {
  const { params: { address } } = request
  if (!isHex(address))
    return error(404, 'Invalid path.')

  const [scheme, token] = request.headers.get('Authorization')?.split(' ') ?? []
  if (scheme !== 'Signature')
    return error(401, 'Missing or malformed authorization token.')

  const [messageB64, signature] = token.split(':')
  if (!isHex(signature))
    return error(401, 'Malformed token.')

  const message = atob(messageB64)
  if (!await verifyMessage({ address, message, signature }))
    return error(403, 'Invalid token.')

  const data = message.slice(message.indexOf('\n'))
  const parsed = Data.parse(await JSON.parse(data))
  if (parsed.address != address)
    return error(403, 'Token is issued for another address.')

  const duration = (Date.now() - parsed.timestamp)
  if (duration <= 0 || duration >= 600000)
    return error(403, 'Token expired.')
}

function isHex(s: string): s is `0x${string}` {
  return s.length >= 2 && s[0] === '0' && s[1] === 'x'
}

const Data = z.object({
  address: z.string(),
  timestamp: z.number(),
})
