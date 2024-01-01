import { Env } from '@/src'
import { addUsage } from '@/src/bills'
import { IRequest, error, json } from 'itty-router'
import { z } from 'zod'

export async function handleGetFile(request: IRequest, env: Env) {
  const { params: { address, filename } } = request
  const key = `${address}/files/${filename}`

  const file = await env.files.get(key)
  if (file === null) return error(404, 'File not exist.')
  const headers = new Headers()
  file.writeHttpMetadata(headers)
  return new Response(file.body, { headers })
}

export async function handleStartUploadFile(request: IRequest, env: Env) {
  const { params: { address, filename } } = request
  const key = `${address}/files/${filename}`
  const { objects: [info] } = await env.files.list({ prefix: key })
  if (info !== undefined) {
    await env.files.delete(key)
    await addUsage(address, -info.size, env)
  }
  const upload = await env.files.createMultipartUpload(key)
  return json({ upload_id: upload.uploadId })
}

export async function handleUploadFilePart(request: IRequest, env: Env) {
  const { params: { address, filename, upload_id, part } } = request
  if (request.body === null) return error(400, 'Body should not be null.')
  const upload = await env.files.resumeMultipartUpload(`${address}/files/${filename}`, upload_id)
  const uploaded = await upload.uploadPart(Number(part), request.body)
  return json(uploaded)
}

export async function handleCompleteUploadFile(request: IRequest, env: Env) {
  const { params: { address, filename, upload_id } } = request
  const parsed = z.object({
    partNumber: z.number(),
    etag: z.string(),
  }).array().safeParse(await request.json())
  if (!parsed.success) return error(400, 'Malformed request body.')

  const upload = await env.files.resumeMultipartUpload(`${address}/files/${filename}`, upload_id)
  await upload.complete(parsed.data)

  const key = `${address}/files/${filename}`
  const { objects: [info] } = await env.files.list({ prefix: key })
  if (info === undefined) return error(500, 'Unexpected file not found.')
  await addUsage(address, info.size, env)

  return json({ completed: key })
}
