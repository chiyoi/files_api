import { error, json, Router } from 'itty-router'
import { withAuth } from '@/src/auth'
import { listFiles, getFile, deleteFile, putFile, withKeyResolved, withNameResolved, startUploadFile, uploadFilePart, completeUploadFile } from '@/src/files'
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
  router.get('/api/:address/files/:filename', withNameResolved, withKeyResolved, withCIDFromFiles, getFile)
  router.put('/api/:address/files/:filename', withAuth, withNameResolved, withKeyResolved, withFilePinned, putFile)
  router.delete('/api/:address/files/:filename', withAuth, withNameResolved, withKeyResolved, withCIDFromFiles, withFileUnpinned, deleteFile)

  router.get('/api/:address/bills/current_period')
  router.get('/api/:address/bills/past_due')

  router.post('/api/:address/extra_large_files/:filename/start', withAuth, withNameResolved, withKeyResolved, startUploadFile)
  router.post('/api/:address/extra_large_files/:filename/:uploadID/:part', withAuth, withNameResolved, withKeyResolved, uploadFilePart)
  router.post('/api/:address/extra_large_files/:filename/:uploadID/complete', withAuth, withNameResolved, withKeyResolved, completeUploadFile)

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
