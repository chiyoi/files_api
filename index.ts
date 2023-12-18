import { error, json, Router } from 'itty-router'
import { withAuth } from './auth'
import { deleteFile, mayListFiles, getFile, putFile, withResolvedKey } from './files'

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router()
    .handle(request, env, ctx)
    .catch(error)
}

function router() {
  const router = Router()
  router.all('/ping', () => json('Pong!'))
  router.all('/version', (_, env: Env) => json(env.VERSION))

  router.get('/api/:address', withAuth, withResolvedKey, mayListFiles, getFile)
  router.all('/api/:address', () => error(405, 'Method not allowed.'))

  router.get('/api/:address/:filename', withAuth, withResolvedKey, mayListFiles, getFile)
  router.put('/api/:address/:filename', withAuth, withResolvedKey, putFile)
  router.delete('/api/:address/:filename', withAuth, withResolvedKey, deleteFile)
  router.all('/api/:address/:filename', () => error(405, 'Method not allowed.'))

  router.all('*', () => error(404, 'Invalid path.'))
  return router
}

export interface Env {
  VERSION: string,
  files: R2Bucket,
}
