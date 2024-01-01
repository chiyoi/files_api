import { error, Router } from 'itty-router'
import { withAccountResolved, withAuth } from '@/src/auth'
import { handleListWithinKey, handleGetFileFromCID, handleDeleteKey, handlePutFileCID } from '@/src/files'
import { withCIDFromFiles, withFilePinned, withFileUnpinned } from '@/src/pin'
import { handleGetCurrentPeriodBill, handleGetPastDueBill, handlePastDuePaid } from '@/src/bills'
import { handleCompleteUploadFile, handleGetFile, handleStartUploadFile, handleUploadFilePart } from '@/src/large'

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router()
    .handle(request, env, ctx)
    .catch(error),
  scheduled: (event: Event, env: Env, ctx: ExecutionContext) => {
    event.type
  },
}

function router() {
  const router = Router()
  router.all('/ping', () => new Response('Pong!\n'))

  router.get('/api/:address/files', withAccountResolved, handleListWithinKey)
  router.get('/api/:address/files/:filename', withAccountResolved, withCIDFromFiles, handleGetFileFromCID)
  router.put('/api/:address/files/:filename', withAccountResolved, withAuth, withFilePinned, handlePutFileCID)
  router.delete('/api/:address/files/:filename', withAccountResolved, withAuth, withCIDFromFiles, withFileUnpinned, handleDeleteKey)

  router.get('/api/:address/bills/current_period', withAccountResolved, withAuth, handleGetCurrentPeriodBill)
  router.get('/api/:address/bills/past_due', withAccountResolved, withAuth, handleGetPastDueBill)
  router.post('/api/:address/bills/past_due_paid', withAccountResolved, withAuth, handlePastDuePaid)

  router.get('/api/:address/extra_large_files/:filename', withAccountResolved, handleGetFile)
  router.post('/api/:address/extra_large_files/:filename/uploads', withAccountResolved, withAuth, handleStartUploadFile)
  router.put('/api/:address/extra_large_files/:filename/uploads/:upload_id/parts/:part', withAccountResolved, withAuth, handleUploadFilePart)
  router.post('/api/:address/extra_large_files/:filename/uploads/:upload_id/complete', withAccountResolved, withAuth, handleCompleteUploadFile)
  router.delete('/api/:address/extra_large_files/:filename', withAccountResolved, withAuth, handleDeleteKey)

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
