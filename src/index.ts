import { error, json, Router } from 'itty-router'
import { withAuth } from './auth'
import { listFiles, deleteFile, putFile, withResolvedPrefix } from './files'
import { getSalt, rotateSalt, withSalt } from './salt'
import { decryptData, encryptData, getKeyFromPBKDF2 } from './crypto'

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router()
    .handle(request, env, ctx)
    .catch(error)
}

function router() {
  const router = Router()
  router.all('/ping', () => json('Pong!'))
  router.all('/test', async () => {
    const key = await getKeyFromPBKDF2('nyan', 'neko')
    const text = 'Nyan~'
    const cipher = await encryptData(text, key)
    const decrypted = await decryptData(cipher, key)
    return json({ key, text, cipher, decrypted })
  })

  router.get('/api/salts/:address', withSalt, getSalt)
  router.post('/api/salts/:address', withSalt, withAuth, withResolvedPrefix, rotateSalt)
  router.all('/api/salts/:address', () => error(405, 'Method not allowed.'))

  router.get('/api/:address', withSalt, withAuth, withResolvedPrefix, listFiles)
  router.all('/api/:address', () => error(405, 'Endpoint (list files) is readonly.'))

  router.get('/api/:address/:filename', withSalt, withAuth, withResolvedPrefix, listFiles)
  router.put('/api/:address/:filename', withSalt, withAuth, withResolvedPrefix, putFile)
  router.delete('/api/:address/:filename', withSalt, withAuth, withResolvedPrefix, deleteFile)
  router.all('/api/:address/:filename', () => error(405, 'Method not allowed.'))

  router.all('*', () => error(404, 'Invalid path.'))
  return router
}

export interface Env {
  VERSION: string,
  PINATA_ENDPOINT: string,
  PINATA_JWT_KEY: string,
  files: R2Bucket,
}