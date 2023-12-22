import { IRequest, error } from 'itty-router'
import { z } from 'zod'
import { Env } from '@/src'

export async function withCIDFromFiles(request: IRequest, env: Env) {
  const { params: { key } } = request
  const cid = await (await env.files.get(key))?.text()
  if (cid === undefined) return error(404, 'File not found.')
  request.params.cid = cid
}

export async function withFilePinned(request: IRequest, env: Env) {
  const form = new FormData()
  form.append('file', await request.blob())
  const response = await fetch(`${env.PINATA_ENDPOINT}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${env.PINATA_JWT_KEY}`,
    },
    body: form,
  })
  const { IpfsHash: cid } = z.object({ IpfsHash: z.string() }).parse(await response.json())
  request.params.cid = cid
}

export async function withFileUnpinned(request: IRequest, env: Env) {
  const { params: { cid } } = request
  const response = await fetch(`${env.PINATA_ENDPOINT}/pinning/unpin/${cid}`, {
    method: 'DELETE',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${env.PINATA_JWT_KEY}`,
    }
  })
  if (!response.ok) {
    console.error(`Unpin file error: ${await response.text()}`)
    return error(500, 'Unpin file error.')
  }
}
