import { addUsage } from '@/src/bills'
import { IRequest, json } from 'itty-router'
import { z } from 'zod'
import { Env } from '@/src'
import { error } from '@/src/internal'

export const handleListLargeFiles = async (request: IRequest, env: Env) => {
  const { params: { address } } = request
  const prefix = `${address}/large_files/`
  const list = await env.files.list({ prefix })
  const resolved = list.objects.map(({ key, size, uploaded }) => ({
    filename: key.slice(prefix.length),
    size,
    uploaded,
  }))
  return json(resolved)
}

export const handleGetFileFromStorage = async (request: IRequest, env: Env) => {
  const { params: { address, filename } } = request
  const key = `${address}/large_files/${filename}`
  const file = await env.files.get(key)
  if (file === null) return error(404, 'File not exist.')
  const headers = new Headers()
  file.writeHttpMetadata(headers)
  return new Response(file.body, { headers })
}

export const handleStartUploading = async (request: IRequest, env: Env) => {
  const { params: { address, filename } } = request
  const key = `${address}/large_files/${filename}`
  const { objects: [info] } = await env.files.list({ prefix: key })
  if (info !== undefined) {
    await env.files.delete(key)
    await addUsage(address, -info.size, env)
  }
  const upload = await env.files.createMultipartUpload(key)
  return json({ upload_id: upload.uploadId })
}

export const handleUploadPart = async (request: IRequest, env: Env) => {
  const { params: { address, filename, upload_id, part } } = request
  if (request.body === null) return error(400, 'Body should not be null.')
  const upload = await env.files.resumeMultipartUpload(`${address}/large_files/${filename}`, upload_id)
  const uploaded = await upload.uploadPart(Number(part), request.body)
  return json(uploaded)
}

export const handleCompleteUploading = async (request: IRequest, env: Env) => {
  const { params: { address, filename, upload_id } } = request
  const parsed = z.object({
    partNumber: z.number(),
    etag: z.string(),
  }).array().safeParse(await request.json())
  if (!parsed.success) return error(400, 'Malformed request body.')

  const key = `${address}/large_files/${filename}`
  const upload = await env.files.resumeMultipartUpload(key, upload_id)
  await upload.complete(parsed.data)

  const { objects: [info] } = await env.files.list({ prefix: key })
  if (info === undefined) return error(500, 'Unexpected file not found.')
  await addUsage(address, info.size, env)

  return json({ completed: { key } })
}

export const handleDeleteLargeFile = async (request: IRequest, env: Env) => {
  const { params: { address, filename } } = request
  const key = `${address}/large_files/${filename}`

  const { objects: [info] } = await env.files.list({ prefix: key })
  if (info === undefined) return error(500, 'Unexpected file not found.')

  await env.files.delete(key)
  await addUsage(address, -info.size, env)
  return json({ deleted: { key } })
}
