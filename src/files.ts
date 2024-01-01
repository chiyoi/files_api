import { IRequest, error, json } from 'itty-router'
import { Env } from '@/src'
import { addUsage } from '@/src/bills'

export async function handleListWithinKey(request: IRequest, env: Env) {
  const { params: { address, filename } } = request
  const prefix = `${address}/files/${filename}`
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
  const { params: { address, filename } } = request
  const key = `${address}/files/${filename}`

  const { objects: [info] } = await env.files.list({ prefix: key })
  if (info === undefined) return error(500, 'Unexpected file not found.')

  await env.files.delete(key)
  await addUsage(address, info.size, env)
  return json({ deleted: key })
}

export async function handlePutFileCID(request: IRequest, env: Env) {
  const { params: { address, filename, cid } } = request
  const key = `${address}/files/${filename}`
  await env.files.put(key, cid)

  const { objects: [info] } = await env.files.list({ prefix: key })
  if (info === undefined) return error(500, 'Unexpected file not found.')
  await addUsage(address, info.size, env)

  return json({ put: key })
}
