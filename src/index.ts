import { error, Router } from 'itty-router'
import { withAuth } from '@/src/auth'
import { handleListWithinKey, handleGetFileFromCID, handleDeleteKey, handlePutFileCID, withKeyResolved, withNameResolved, handleStartUploadFile, handleUploadFilePart, handleCompleteUploadFile, handleGetFile } from '@/src/files'
import { withCIDFromFiles, withFilePinned, withFileUnpinned } from '@/src/pin'
import { handleGetCurrentPeriodBill, handleGetPastDueBill, handlePastDuePaid } from '@/src/bills'

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router()
    .handle(request, env, ctx)
    .catch(error),
  scheduled: (event: Event, env: Env, ctx: ExecutionContext) => {

  },
}

function router() {
  const router = Router()
  router.all('/ping', () => new Response('Pong!\n'))

  router.get('/api/:address/files', withNameResolved, withKeyResolved, handleListWithinKey)
  router.get('/api/:address/files/:filename', withNameResolved, withKeyResolved, withCIDFromFiles, handleGetFileFromCID)
  router.put('/api/:address/files/:filename', withAuth, withNameResolved, withKeyResolved, withFilePinned, handlePutFileCID)
  router.delete('/api/:address/files/:filename', withAuth, withNameResolved, withKeyResolved, withCIDFromFiles, withFileUnpinned, handleDeleteKey)

  router.get('/api/:address/bills/current_period', withAuth, withNameResolved, handleGetCurrentPeriodBill)
  router.get('/api/:address/bills/past_due', withAuth, withNameResolved, handleGetPastDueBill)
  router.post('/api/:address/bills/past_due_paid', withAuth, withNameResolved, handlePastDuePaid)

  router.get('/api/:address/extra_large_files/:filename', withNameResolved, withKeyResolved, handleGetFile)
  router.post('/api/:address/extra_large_files/:filename/start', withAuth, withNameResolved, withKeyResolved, handleStartUploadFile)
  router.put('/api/:address/extra_large_files/:filename/:upload_id/:part', withAuth, withNameResolved, withKeyResolved, handleUploadFilePart)
  router.post('/api/:address/extra_large_files/:filename/:upload_id/complete', withAuth, withNameResolved, withKeyResolved, handleCompleteUploadFile)
  router.delete('/api/:address/extra_large_files/:filename', withAuth, withNameResolved, withKeyResolved, handleDeleteKey)

  router.all('*', () => error(404, 'Endpoint not exist.'))
  return router
}

export interface Env {
  BILLING_CONTRACT_ADDRESS: `0x${string}`,
  BILLING_OWNER_PRIVATE_KEY: `0x${string}`,
  ENS_ENDPOINT: string,
  IPFS_GATEWAY_ENDPOINT: string,
  PINATA_ENDPOINT: string,
  PINATA_JWT_KEY: string,

  files: R2Bucket,
}
