import { error as ittyError } from 'itty-router'

export const error = (status: number, message?: string) => {
  if (message !== undefined) console.error(message)
  return ittyError(status, message)
}
