import { IRequest, error, json } from 'itty-router'
import { Env } from '@/src'

export async function withNameResolved(request: IRequest, env: Env) {
  const { params: { address: name } } = request
  const address = await (await env.files.get(`addresses/${name}`))?.text()
  if (address !== undefined) request.params.address = address
}

export async function resolveName(request: IRequest, env: Env) {
  const { params: { name } } = request
  const address = await (await env.files.get(`addresses/${name}`))?.text()
  if (address === undefined) return error(404, 'Name not exist.')
  return new Response(address)
}

export async function getAddressName(request: IRequest, env: Env) {
  const { params: { address } } = request
  const name = await (await env.files.get(`names/${address}`))?.text()
  return new Response(name ?? '')
}

export async function setAddressName(request: IRequest, env: Env) {
  const { params: { address } } = request
  const name = await request.text()
  if (name === '') return error(400, 'Name should not be empty.')
  const conflict = await env.files.get(`addresses/${name}`)
  if (conflict !== null) return error(409, 'Name is already registered.')
  const oldName = await (await env.files.get(`names/${address}`))?.text()
  await env.files.delete(`addresses/${oldName}`)
  await env.files.put(`names/${address}`, name)
  await env.files.put(`addresses/${name}`, address)
  return json({ set: { name, address } })
}
