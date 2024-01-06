import { error as ittyError } from 'itty-router'

export const error = ((statusOrError: number | any, message?: string) =>
  typeof statusOrError === 'number' ? (
    message !== undefined && console.error(message),
    ittyError(statusOrError, message)
  ) : (
    console.error(statusOrError),
    ittyError(statusOrError)
  )) as (((status: number, message?: string) => Response) | ((error: any) => Response))
