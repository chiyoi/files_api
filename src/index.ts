import { Router } from 'itty-router'
import { withPreprocessed, withAuth } from '@/src/auth'
import { handleListFiles, handleGetFile, handleDeleteFile, handlePutFile } from '@/src/files'
import { chargeAll, handleGetCurrentPeriodBill, handleGetPastDueBill, handlePastDuePaid } from '@/src/bills'
import { handleGetCommunicationCode, handleSetCommunicationCode } from '@/src/communication_code'
import { handleCompleteUploading, handleDeleteLargeFile, handleGetFileFromStorage, handleListLargeFiles, handleStartUploading, handleUploadPart } from '@/src/large'
import { error } from '@/src/internal'


export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router()
    .handle(request, env, ctx)
    .catch(error),
  scheduled: (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => chargeAll(env)
    .catch(console.error),
}

const router = () => {
  const router = Router()
  router.all('/ping', () => new Response('Pong!\n'))

  router.get('/api/:address/files', withPreprocessed, handleListFiles)
  router.get('/api/:address/files/:filename', withPreprocessed, handleGetFile)
  router.put('/api/:address/files/:filename', withPreprocessed, withAuth, handlePutFile)
  router.delete('/api/:address/files/:filename', withPreprocessed, withAuth, handleDeleteFile)

  router.get('/api/:address/bills/current_period', withPreprocessed, handleGetCurrentPeriodBill)
  router.get('/api/:address/bills/past_due', withPreprocessed, handleGetPastDueBill)
  router.post('/api/:address/bills/past_due_paid', withPreprocessed, handlePastDuePaid)

  router.get('/api/:address/large_files', withPreprocessed, handleListLargeFiles)
  router.get('/api/:address/large_files/:filename', withPreprocessed, handleGetFileFromStorage)
  router.post('/api/:address/large_files/:filename/uploads', withPreprocessed, withAuth, handleStartUploading)
  router.put('/api/:address/large_files/:filename/uploads/:upload_id/parts/:part', withPreprocessed, withAuth, handleUploadPart)
  router.post('/api/:address/large_files/:filename/uploads/:upload_id/complete', withPreprocessed, withAuth, handleCompleteUploading)
  router.delete('/api/:address/large_files/:filename', withPreprocessed, withAuth, handleDeleteLargeFile)

  router.get('/api/:address/communication_code', withPreprocessed, handleGetCommunicationCode)
  router.put('/api/:address/communication_code', withPreprocessed, withAuth, handleSetCommunicationCode)

  router.all('*', () => error(404, 'Endpoint not exist.'))
  return router
}

export type Env = {
  BILLING_CONTRACT_ADDRESS: `0x${string}`,
  BILLING_OWNER_PRIVATE_KEY: `0x${string}`,
  ENS_ENDPOINT: string,
  IPFS_GATEWAY_ENDPOINT: string,
  PINATA_JWT_KEY: string,

  files: R2Bucket,
}
