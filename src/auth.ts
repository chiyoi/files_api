import { IRequest, error } from 'itty-router'
import { isHex, verifyMessage } from 'viem'
import { Env } from '.'

export async function withAuth(request: IRequest, _: Env) {
  const { params: { address } } = request
  if (!isHex(address)) return error(400, 'Invalid address.')

  const [scheme, token] = request.headers.get('Authorization')?.split(' ') ?? []
  if (scheme !== 'Signature') return error(401, 'Missing or malformed authorization token.')

  const [messageB64, signature] = token.split(':')
  if (!isHex(signature)) return error(401, 'Malformed token.')

  const message = atob(messageB64)
  if (!await verifyMessage({ address, message, signature })) return error(403, 'Invalid signature.')
}
