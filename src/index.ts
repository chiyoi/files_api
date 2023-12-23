import { error, Router } from 'itty-router'
import { withAuth } from '@/src/auth'
import { listFiles, getFile, deleteFile, putFile, withKeyResolved } from '@/src/files'
import { getAddressName, resolveName, setAddressName, withNameResolved } from '@/src/names'
import { withCIDFromFiles, withFilePinned, withFileUnpinned } from '@/src/pin'

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router()
    .handle(request, env, ctx)
    .catch(error)
}

function router() {
  const router = Router()
  router.all('/ping', () => new Response('Pong!'))

  router.get('/api/addresses/:name', resolveName)
  router.all('/api/addresses/:name', () => error(405, 'Endpoint <Resolve Name> is read-only.'))

  router.get('/api/names/:address', getAddressName)
  router.put('/api/names/:address', withAuth, setAddressName)
  router.all('/api/names/:address', () => error(405, 'Endpoint <Address Name> only supports GET and PUT.'))

  router.all('/api/bills/:address')

  router.get('/api/files/:address', withNameResolved, withKeyResolved, listFiles)
  router.all('/api/files/:address', () => error(405, 'Endpoint <List Files> is readonly.'))

  router.get('/api/files/:address/:filename', withNameResolved, withKeyResolved, withCIDFromFiles, getFile)
  router.put('/api/files/:address/:filename', withAuth, withNameResolved, withKeyResolved, withFilePinned, putFile)
  router.delete('/api/files/:address/:filename', withAuth, withNameResolved, withKeyResolved, withCIDFromFiles, withFileUnpinned, deleteFile)
  router.all('/api/files/:address/:filename', () => error(405, 'Endpoint <File Manipulations> only supports GET, PUT, and DELETE.'))

  router.all('*', () => error(404, 'Endpoint not exist.'))
  return router
}

export function isHex(s: string): s is `0x${string}` {
  return s.length >= 2 && s[0] === '0' && s[1] === 'x'
}

export interface Env {
  IPFS_GATEWAY_ENDPOINT: string,
  PINATA_ENDPOINT: string,
  PINATA_JWT_KEY: string,
  BILLING_CONTRACT_ADDRESS: `0x${string}`,
  BILLING_OWNER_PRIVATE_KEY: `0x${string}`,
  files: R2Bucket,
}
