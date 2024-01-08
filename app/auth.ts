import { IRequest, error } from 'itty-router'
import { isHex } from 'viem'
import { Env } from '@/app'
import { checkUsage } from '@/app/bills'
import { publicClient } from '@/app/internal'

export const withPreprocessed = async (request: IRequest, env: Env) => {
  const { params: { address: name } } = request
  if (!isHex(name)) {
    const response = await fetch(`${env.ENS_ENDPOINT}/${name}/address`)
    if (!response.ok) {
      if (response.status === 404) return error(400, 'Name not exist.')
      console.warn(`Resolve name error: ${await response.text()}`)
    }
    request.params.address = await response.text()
  }

  const { params: { address, filename } } = request
  if (!isHex(address)) return error(400, 'Address should be hex.')
  request.params.address = address.toLowerCase()
  if (filename !== undefined) {
    request.params.filename = decodeURIComponent(filename)
  }
}

export const withAuth = async (request: IRequest, env: Env) => {
  const { params: { address } } = request
  if (!isHex(address)) return error(400, 'Invalid address.')

  const [scheme, token] = request.headers.get('Authorization')?.split(' ') ?? []
  if (scheme !== 'Signature') return error(401, 'Missing or malformed authorization token.')

  const [messageB64, signature] = token.split(':')
  if (!isHex(signature)) return error(401, 'Malformed token.')

  const message = atob(messageB64)
  if (!await publicClient.verifyMessage({ address, message, signature })) return error(403, 'Invalid signature.')

  const code = await (await env.files.get(`${address}/communication_code`))?.text()
  if (code !== undefined && !message.includes(code)) return error(403, 'Message should contain communication code.')

  const pastDue = await env.files.get(`${address}/bills/past_due`)
  if (pastDue !== null) return error(402, 'Account has past-due bill.')

  const usage = await checkUsage(address, env)
  await env.files.put(`addresses/${address}`, '')
}
