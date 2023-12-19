import { IRequest, json } from 'itty-router'
import { Env } from '.'
import { z } from 'zod'
import { decryptData, encryptData } from './crypto'
import { WithCryptoKey } from './auth'

export async function withResolvedPrefix(request: IRequest & WithCryptoKey, _: Env) {
  const { key, params: { address, filename } } = request
  request.params.address = address.toLowerCase()
  if (!!filename) {
    const filenameCipher = await encryptData(decodeURIComponent(filename), key)
    request.params.prefix = [address, filenameCipher].join('/')
  } else {
    request.params.prefix = address
  }
}

export async function listFiles(request: IRequest & WithCryptoKey, env: Env) {
  const { key, params: { address, prefix } } = request
  const list = await env.files.list({ prefix })
  const resolved = (await Promise.all(list.objects.map(async ({ key: objectKey }) => {
    const cidCipher = await (await env.files.get(objectKey))?.text()
    if (!cidCipher) return
    const cid = await decryptData(cidCipher, key)
    const filenameCipher = objectKey.slice(`${address}/`.length)
    const filename = await decryptData(filenameCipher, key)
    return { filename, cid }
  })))
  return json(resolved)
}

export async function putFile(request: IRequest & WithCryptoKey, env: Env) {
  let { params: { prefix } } = request

  const form = new FormData()
  form.append('file', await request.blob())

  const pinResp = await fetch(`${env.PINATA_ENDPOINT}/pinning/pinFileToIPFS`, {
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

  const cidCipher = await encryptData(info.IpfsHash, request.key)
  await env.files.put(prefix, cidCipher)
  return json({ put: prefix })
}

export async function deleteFile(request: IRequest, env: Env) {
  const { params: { prefix } } = request
  await env.files.delete(prefix)
  return json({ deleted: prefix })
}
