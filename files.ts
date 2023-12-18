import { IRequest, json } from 'itty-router'
import { Env } from '.'
import { z } from 'zod'

export async function withResolvedKey(request: IRequest, _: Env) {
  const { params: { address, filename } } = request
  request.params.key = filename ? [address.toLowerCase(), decodeURIComponent(filename)].join('/') : address
}

export async function listFiles(request: IRequest, env: Env) {
  const { params: { key } } = request
  const list = await env.files.list({ prefix: key })
  const resolved = (await Promise.all(list.objects.map(async ({ key }) => {
    const cid = await (await env.files.get(key))?.text()
    if (!cid) return
    return { key, cid }
  }))).filter(e => !!e)
  return json(resolved)
}

export async function putFile(request: IRequest, env: Env) {
  let { params: { key } } = request

  const form = new FormData()
  form.append('file', await request.blob())

  const pinResp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${env.PINATA_JWT_KEY}`,
    },
    body: form,
  })
  const info = z.object({
    IpfsHash: z.string(),
    PinSize: z.number(),
    Timestamp: z.coerce.date(),
  }).parse(await pinResp.json())

  await env.files.put(key, info.IpfsHash)
  return json({ put: key })
}

export async function deleteFile(request: IRequest, env: Env) {
  const { params: { key } } = request
  await env.files.delete(key)
  return json({ deleted: key })
}
