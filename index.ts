import { error, json, Router } from 'itty-router'
import { withAuth } from './auth'
import { deleteFile, mayListFiles, getFile, putFile } from './files'

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router()
    .handle(request, env, ctx)
    .then(addCorsHeaders)
    .catch(error)
}

function router() {
  const router = Router()
  router.all('/ping', () => json('Pong!'))
  router.all('/version', (_, env: Env) => json(env.VERSION))

  router.get('/api/:address', withAuth, mayListFiles, getFile)
  router.get('/api/:address/:filename', withAuth, mayListFiles, getFile)
  router.put('/api/:address/:filename', withAuth, putFile)
  router.delete('/api/:address/:filename', withAuth, deleteFile)
  router.all('/api/:address/:filename', () => error(405, 'Method not allowed.'))

  router.options('*', handleOptions)
  router.all('*', () => error(404, 'Invalid path.'))
  return router
}

export interface Env {
  VERSION: string,
  files: R2Bucket,
}

// Generated: Allow all origins. (GPT-4)
const handleOptions = (request: Request) => {
  // Make sure the necessary headers are present for this to be a valid pre-flight request
  // Handle CORS pre-flight request.
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

// Add CORS headers to every response
const addCorsHeaders = (response: Response) => {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  return response
}
// End Generated
