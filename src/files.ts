import { IRequest, error, json } from 'itty-router'
import { Env } from '@/src'
import { isHex } from 'viem'
import { z } from 'zod'

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

export async function handleListWithinKey(request: IRequest, env: Env) {
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

export async function handleGetFileFromCID(request: IRequest, env: Env) {
  let { params: { cid } } = request
  return Response.redirect(`${env.IPFS_GATEWAY_ENDPOINT}/ipfs/${cid}`, 307)
}

export async function handleDeleteKey(request: IRequest, env: Env) {
  const { params: { key } } = request
  await env.files.delete(key)
  return json({ deleted: key })
}

export async function handlePutFileCID(request: IRequest, env: Env) {
  const { params: { key, cid } } = request
  await env.files.put(key, cid)
  return json({ put: key })
}

export async function handleGetFile(request: IRequest, env: Env) {
  const { params: { key } } = request
  const file = await env.files.get(key)
  if (file === null) return error(404, 'File not exist.')
  const headers = new Headers()
  file.writeHttpMetadata(headers)
  return new Response(file.body, { headers })
}

export async function handleStartUploadFile(request: IRequest, env: Env) {
  const { params: { key } } = request
  const upload = await env.files.createMultipartUpload(key)
  return json({ uploadID: upload.uploadId })
}

export async function handleUploadFilePart(request: IRequest, env: Env) {
  const { params: { key, upload_id, part } } = request
  if (request.body === null) return error(400, 'Body should not be null.')
  const upload = await env.files.resumeMultipartUpload(key, upload_id)
  const uploaded = await upload.uploadPart(Number(part), request.body)
  return json(uploaded)
}

export async function handleCompleteUploadFile(request: IRequest, env: Env) {
  const { params: { key, upload_id } } = request
  const parsed = z.object({
    partNumber: z.number(),
    etag: z.string(),
  }).array().safeParse(await request.json())
  if (!parsed.success) return error(400, 'Malformed request body.')

  const upload = await env.files.resumeMultipartUpload(key, upload_id)
  await upload.complete(parsed.data)
  return json({ completed: key })
}
