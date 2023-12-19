import { IRequest, json } from 'itty-router'
import { Env } from '.'
import { generateSalt } from './crypto'

export type WithSalt = { salt: string }

export async function withSalt(request: IRequest & WithSalt, env: Env) {
  const { params: { address } } = request
  request.salt = await (await env.files.get(`salts/${address}`))?.text() ?? generateSalt()
  await env.files.put(`salts/${address}`, request.salt)
}

export async function getSalt(request: IRequest & WithSalt, env: Env) {
  const { salt } = request
  return json(salt)
}

export async function rotateSalt(request: IRequest, env: Env) {
  const { params: { address, prefix } } = request
  const list = await env.files.list({ prefix })
  await env.files.delete(list.objects.map(({ key }) => key))
  await env.files.delete(`salts/${address}`)
  return json({ reset: address })
}
