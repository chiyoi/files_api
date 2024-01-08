import { IRequest, json } from 'itty-router'
import { Env } from '@/app'
import { checkUsage } from '@/app/bills'
import { error } from '@/app/internal'
import { listFiles, pinFileToIPFS, unpinFile } from '@/app/internal/pinata-requests'
import { isHex } from 'viem'

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
  const key = `${address}/files/${filename}`
  if (!isHex(address)) return error(400, 'Address should be hex.')
  await deleteFile(address, filename, env)
  const { cid, size } = await pinFileToIPFS(await request.blob(), env)
  await checkUsage(address, env, size)
  await increaseReferenceCounter(cid, env)
  await env.files.put(key, cid)
  return json({ put: { address, filename, cid } })
}

export const handleDeleteFile = async (request: IRequest, env: Env) => {
  const { params: { address, filename } } = request
  if (!isHex(address)) return error(400, 'Address should be hex.')
  if (!await deleteFile(address, filename, env)) {
    console.warn(`Delete File: file not found. address: "${address}", filename: "${filename}"`)
    return json({ file_not_found: { address, filename } })
  }
  return json({ deleted: { address, filename } })
}

const deleteFile = async (address: `0x${string}`, filename: string, env: Env) => {
  const key = `${address}/files/${filename}`
  const cid = await (await env.files.get(key))?.text()
  if (cid === undefined) return false
  const [info] = await listFiles(env, { hashContains: cid, status: 'pinned' })
  if (info === undefined) throw new Error(`Unexpected missing file info.`)
  await env.files.delete(key)
  await checkUsage(address, env, -info.size)
  await decreaseReferenceCounter(cid, env)
  return true
}

const increaseReferenceCounter = async (cid: string, env: Env) => {
  const count = Number(
    await (await env.files.get(`cid_reference_counts/${cid}`))?.text() ?? 0
  ) + 1
  await env.files.put(`cid_reference_counts/${cid}`, String(count))
}

const decreaseReferenceCounter = async (cid: string, env: Env) => {
  const count = Number(
    await (await env.files.get(`cid_reference_counts/${cid}`))?.text() ?? 0
  ) - 1
  if (count > 0) {
    await env.files.put(`cid_reference_counts/${cid}`, String(count))
  } else if (count === 0) {
    await unpinFile(cid, env)
    await env.files.delete(`cid_reference_counts/${cid}`)
  }
}
