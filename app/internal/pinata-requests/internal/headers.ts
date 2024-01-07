import { EnvPinataJWTKey } from './env'

export const standard: (env: EnvPinataJWTKey) => HeadersInit = env => ({
  accept: 'application/json',
  authorization: `Bearer ${env.PINATA_JWT_KEY}`,
})
