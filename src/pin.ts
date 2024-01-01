import { IRequest, error } from 'itty-router'
import { z } from 'zod'
import { Env } from '@/src'
import { addUsage } from '@/src/bills'

export async function withCIDFromFiles(request: IRequest, env: Env) {
  const { params: { address, filename } } = request
  const cid = await (await env.files.get(`${address}/files/${filename}`))?.text()
  if (cid === undefined) return error(404, 'File not found.')
  request.params.cid = cid
}

export async function withFilePinned(request: IRequest, env: Env) {
  const { params: { address } } = request
  const form = new FormData()
  form.append('file', await request.blob())
  const filePinned = await fetch(`${env.PINATA_ENDPOINT}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${env.PINATA_JWT_KEY}`,
    },
    body: form,
  })
  const { IpfsHash: cid, PinSize, isDuplicate } = z.object({
    IpfsHash: z.string(),
    PinSize: z.number(),
    isDuplicate: z.boolean(),
  }).parse(await filePinned.json())
  request.params.cid = cid
  if (!isDuplicate) await addUsage(address, PinSize, env)
}

export async function withFileUnpinned(request: IRequest, env: Env) {
  const { params: { address, cid } } = request
  const fileInfo = await fetch(`${env.PINATA_ENDPOINT}/data/pinList?hashContains=${cid}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${env.PINATA_JWT_KEY}`,
    }
  })
  const parsed = z.object({
    rows: z.object({
      size: z.number(),
    }).array().min(1).max(1)
  }).safeParse(await fileInfo.json())
  if (!parsed.success) return error(404, 'File not found.')
  const { rows: [{ size }] } = parsed.data

  const fileUnpinned = await fetch(`${env.PINATA_ENDPOINT}/pinning/unpin/${cid}`, {
    method: 'DELETE',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${env.PINATA_JWT_KEY}`,
    }
  })
  if (!fileUnpinned.ok) {
    console.error(`Unpin file error: ${await fileUnpinned.text()}`)
    return error(500, 'Unpin file error.')
  }
  await addUsage(address, -size, env)
}
