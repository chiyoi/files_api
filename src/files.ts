import { IRequest, json } from 'itty-router'
import { z } from 'zod'
import { Env } from '@/src'
import { addUsage } from '@/src/bills'
import { error } from '@/src/helpers'

export const handleListFiles = async (request: IRequest, env: Env) => {
  const { params: { address } } = request
  const prefix = `${address}/files/`
  const list = await env.files.list({ prefix })
  const resolved = (await Promise.all(list.objects.map(async ({ key }) => {
    const cid = await (await env.files.get(key))?.text()
    if (cid === undefined) return
    const filename = key.slice(prefix.length)
    return { filename, cid }
  })))
  return json(resolved)
}

export const handleGetFile = async (request: IRequest, env: Env) => {
  let { params: { address, filename } } = request
  const cid = await (await env.files.get(`${address}/files/${filename}`))?.text()
  if (cid === undefined) return error(404, 'File not found.')
  return Response.redirect(`${env.IPFS_GATEWAY_ENDPOINT}/ipfs/${cid}`, 307)
}

export const handlePutFile = async (request: IRequest, env: Env) => {
  const { params: { address, filename } } = request
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
  const { IpfsHash: cid, PinSize } = z.object({
    IpfsHash: z.string(),
    PinSize: z.number(),
  }).parse(await filePinned.json())
  request.params.cid = cid
  await addUsage(address, PinSize, env)

  const cid0 = await (await env.files.get(`${address}/files/${filename}`))?.text()
  if (cid0 !== undefined) await decreaseReferenceCounter(cid0, env)
  increaseReferenceCounter(cid, env)

  const key = `${address}/files/${filename}`
  await env.files.put(key, cid)
  return json({ put: { key, cid } })
}

export const handleDeleteFile = async (request: IRequest, env: Env) => {
  const { params: { address, filename } } = request
  const key = `${address}/files/${filename}`
  const cid = await (await env.files.get(key))?.text()
  if (cid === undefined) {
    console.warn(`File not found. key: ${key}`)
    return json({ file_not_found: { address, filename } })
  }
  request.params.cid = cid

  const fileInfo = await (await fetch(`${env.PINATA_ENDPOINT}/data/pinList?hashContains=${cid}&status=pinned`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${env.PINATA_JWT_KEY}`,
    }
  }))?.json()
  const { rows: [{ size }] } = z.object({
    rows: z.object({
      size: z.number(),
    }).array().min(1)
  }).parse(fileInfo)

  const fileUnpinned = await fetch(`${env.PINATA_ENDPOINT}/pinning/unpin/${cid}`, {
    method: 'DELETE',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${env.PINATA_JWT_KEY}`,
    }
  })
  if (!fileUnpinned.ok) return error(500, `Unpin file error: ${await fileUnpinned.text()}`)
  await addUsage(address, -size, env)

  await env.files.delete(key)
  return json({ deleted: key })
}

const increaseReferenceCounter = async (cid: string, env: Env) => {
  const count = Number(await (await env.files.get(`cid_reference_counts/${cid}`))?.text() ?? 0)
  await env.files.put(`cid_reference_counts/${cid}`, String(count + 1))
}

const decreaseReferenceCounter = async (cid: string, env: Env) => {
  const count = Number(await (await env.files.get(`cid_reference_counts/${cid}`))?.text())
  if (isNaN(count)) return error(500, 'Unexpected missing reference counter.')
  if (count > 1) {
    await env.files.put(`cid_reference_counts/${cid}`, String(count - 1))
    return
  }
  await env.files.delete(`cid_reference_counts/${cid}`)
}
