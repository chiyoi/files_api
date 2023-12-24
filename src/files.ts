import { IRequest, error, json } from 'itty-router'
import { Env } from '@/src'
import { isHex } from 'viem'

export async function withNameResolved(request: IRequest, env: Env) {
  const { params: { address: name } } = request
  if (!isHex(name)) {
    const response = await fetch(`${env.ENS_ENDPOINT}/${name}/address`)
    if (!response.ok) {
      if (response.status === 404) return error(400, 'Name not exist.')
      console.warn(`Resolve name error: ${await response.text()}`)
    }
    request.params.address = await response.text()
  }
}

export async function withKeyResolved(request: IRequest, _: Env) {
  const { params: { address, filename } } = request
  if (!isHex(address)) return error(400, 'Address should be like `0x${string}`')
  request.params.address = address.toLowerCase()
  if (filename !== undefined) {
    request.params.filename = decodeURIComponent(filename)
    request.params.key = [address, request.params.filename].join('/')
  } else {
    request.params.key = address
  }
}

export async function listFiles(request: IRequest, env: Env) {
  const { params: { address, key: prefix } } = request
  const list = await env.files.list({ prefix })
  const resolved = (await Promise.all(list.objects.map(async ({ key }) => {
    const cid = await (await env.files.get(key))?.text()
    if (cid === undefined) return
    const filename = key.slice(`${address}/`.length)
    return { filename, cid }
  })))
  return json(resolved)
}

export async function putFile(request: IRequest, env: Env) {
  let { params: { key, cid } } = request
  await env.files.put(key, cid)
  return json({ put: key })
}

export async function getFile(request: IRequest, env: Env) {
  let { params: { cid } } = request
  return Response.redirect(`${env.IPFS_GATEWAY_ENDPOINT}/ipfs/${cid}`, 307)
}

export async function deleteFile(request: IRequest, env: Env) {
  const { params: { key } } = request
  await env.files.delete(key)
  return json({ deleted: key })
}
