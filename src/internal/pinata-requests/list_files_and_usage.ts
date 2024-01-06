import { z } from 'zod'
import { PINATA_ENDPOINT } from '.'
import { EnvPinataJWTKey } from './internal/env'
import { withQuery } from './internal/query'
import { standard } from './internal/headers'

export const listFiles = async (env: EnvPinataJWTKey, query?: QueryListFiles) => {
  const endpoint = withQuery(`${PINATA_ENDPOINT}/data/pinList`, query)
  const response = await fetch(endpoint, { headers: standard(env) })
  if (!response.ok) throw new Error(`List Files error: ${await response.text()}`)
  const { rows } = z.object({
    rows: z.object({
      id: z.string(),
      ipfs_pin_hash: z.string(),
      size: z.number(),
      metadata: z.record(z.string()),
    }).array()
  }).parse(await response.json())
  return rows
}

export type QueryListFiles = {
  hashContains?: string,
  status?: 'all' | 'pinned' | 'unpinned',
}
