import { IRequest, error, json } from 'itty-router'
import { Env } from '.'

export async function mayListFiles(request: IRequest, env: Env) {
  const { params: { address, filename } } = request
  const key = filename ? [address, filename].join('/') : address
  if (!!request.query['list']) {
    const list = await env.files.list({ prefix: key })
    return json(list.objects.map(item => ({
      key: item.key.slice(`${address}/`.length),
      size: item.size,
      uploaded: item.uploaded,
    })))
  }
}

export async function getFile(request: IRequest, env: Env) {
  const { params: { address, filename } } = request
  const key = filename ? [address, filename].join('/') : address
  const item = await env.files.get(key)
  if (item === null) return error(404, 'File not found.')
  const headers = new Headers()
  item.writeHttpMetadata(headers)
  return new Response(item.body, { headers })
}

export async function putFile(request: IRequest, env: Env) {
  let { params: { address, filename } } = request
  filename = decodeURIComponent(filename)
  const key = [address, filename].join('/')
  await env.files.put(key, request.body)
  return json({ key })
}

export async function deleteFile(request: IRequest, env: Env) {
  const { params: { address, filename } } = request
  const key = [address, filename].join('/')
  await env.files.delete(key)
  return json({ key })
}
