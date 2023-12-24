import { error, json, Router } from 'itty-router'
import { withAuth } from '@/src/auth'
import { listFiles, getFile, deleteFile, putFile, withKeyResolved, withNameResolved } from '@/src/files'
import { withCIDFromFiles, withFilePinned, withFileUnpinned } from '@/src/pin'

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router()
    .handle(request, env, ctx)
    .catch(error),
  async scheduled(event: Event, env: Env, ctx: ExecutionContext) {

  },
}

function router() {
  const router = Router()
  router.all('/ping', () => new Response('Pong!'))

  router.get('/api/:address/files', withNameResolved, withKeyResolved, listFiles)
  router.all('/api/:address/files', () => error(405, 'Endpoint <List Files> is readonly.'))

  router.get('/api/:address/files/:filename', withNameResolved, withKeyResolved, withCIDFromFiles, getFile)
  router.put('/api/:address/files/:filename', withAuth, withNameResolved, withKeyResolved, withFilePinned, putFile)
  router.delete('/api/:address/files/:filename', withAuth, withNameResolved, withKeyResolved, withCIDFromFiles, withFileUnpinned, deleteFile)
  router.all('/api/:_/files/:_', () => error(405, 'Endpoint <File Manipulations> only supports GET, PUT, and DELETE.'))

  router.get('/api/:address/bills/current_period')
  router.get('/api/:address/bills/past_due')
  router.all('/api/:_/bills/:_', () => error(405, 'Endpoint <Billing Status> is read-only.'))

  router.all('*', () => error(404, 'Endpoint not exist.'))
  return router
}

export interface Env {
  BILLING_CONTRACT_ADDRESS: `0x${string}`,
  BILLING_CONTRACT_OWNER_PRIVATE_KEY: `0x${string}`,
  ENS_ENDPOINT: string,
  IPFS_GATEWAY_ENDPOINT: string,
  PINATA_ENDPOINT: string,
  PINATA_JWT_KEY: string,
  files: R2Bucket,
}
