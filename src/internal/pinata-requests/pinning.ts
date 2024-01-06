import { z } from 'zod'
import { PINATA_ENDPOINT } from '.'
import { EnvPinataJWTKey } from './internal/env'
import { standard } from './internal/headers'

export const pinFileToIPFS = async (file: Blob, env: EnvPinataJWTKey) => {
  const endpoint = `${PINATA_ENDPOINT}/pinning/pinFileToIPFS`
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: standard(env),
    body: form,
  })
  if (!response.ok) throw new Error(`Pin File To IPFS error: ${await response.text()}`)
  const { IpfsHash: cid, PinSize: size, isDuplicate } = z.object({
    IpfsHash: z.string(),
    PinSize: z.number(),
    isDuplicate: z.boolean().optional(),
  }).parse(await response.json())
  return { cid, size, isDuplicate: !!isDuplicate }
}

export const unpinFile = async (cid: string, env: EnvPinataJWTKey) => {
  const endpoint = `${PINATA_ENDPOINT}/pinning/unpin/${cid}`
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: standard(env),
  })
  if (!response.ok) throw new Error(`Delete File error: ${await response.text()}`)
}
