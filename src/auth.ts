import { IRequest, error } from 'itty-router'
import { verifyMessage } from 'viem'
import { Env } from '.'
import { getKeyFromPBKDF2 } from './crypto'
import { WithSalt } from './salt'

export type WithCryptoKey = { key: CryptoKey }

export async function withAuth(request: IRequest & WithSalt & WithCryptoKey, _: Env) {
  const { salt, params: { address } } = request
  if (!isHex(address)) return error(404, 'Invalid path.')

  const [scheme, token] = request.headers.get('Authorization')?.split(' ') ?? []
  if (scheme !== 'Signature') return error(401, 'Missing or malformed authorization token.')

  const [messageB64, signature] = token.split(':')
  if (!isHex(signature)) return error(401, 'Malformed token.')

  const message = atob(messageB64)
  if (!await verifyMessage({ address, message, signature })) return error(403, 'Invalid signature.')
  if (!message.includes(salt)) return error(403, 'Message should contain your salt.')

  request.key = await getKeyFromPBKDF2(signature, salt)
}

function isHex(s: string): s is `0x${string}` {
  return s.length >= 2 && s[0] === '0' && s[1] === 'x'
}
