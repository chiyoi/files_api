import { error, json, Router } from 'itty-router'
import { withAuth } from './auth'
import { listFiles, deleteFile, putFile, withResolvedKey } from './files'

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router()
    .handle(request, env, ctx)
    .catch(error)
}

function router() {
  const router = Router()
  router.all('/ping', () => json('Pong!'))

  router.get('/api/:address', withAuth, withResolvedKey, listFiles)
  router.all('/api/:address', () => error(405, 'Method not allowed.'))

  router.get('/api/:address/:filename', withAuth, withResolvedKey, listFiles)
  router.put('/api/:address/:filename', withAuth, withResolvedKey, putFile)
  router.delete('/api/:address/:filename', withAuth, withResolvedKey, deleteFile)
  router.all('/api/:address/:filename', () => error(405, 'Method not allowed.'))

  router.all('*', () => error(404, 'Invalid path.'))
  return router
}

export interface Env {
  VERSION: string,
  PINATA_JWT_KEY: string,
  files: R2Bucket,
}
