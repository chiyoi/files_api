import { IRequest, error } from 'itty-router'
import { createPublicClient, createWalletClient, getContract, http, isHex, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import BillingAccount from '@/abi/BillingAccount'
import { Env } from '@/src'
import { addUsage } from '@/src/bills'

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
})

export function walletClient(env: Env) {
  const account = privateKeyToAccount(env.BILLING_OWNER_PRIVATE_KEY)
  return [account, createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  })] as const
}

export function billingContract(walletClient: WalletClient, env: Env) {
  return getContract({
    address: env.BILLING_CONTRACT_ADDRESS,
    abi: BillingAccount,
    walletClient,
  })
}

export async function withAccountResolved(request: IRequest, env: Env) {
  const { params: { address: name } } = request
  if (!isHex(name)) {
    const response = await fetch(`${env.ENS_ENDPOINT}/${name}/address`)
    if (!response.ok) {
      if (response.status === 404) return error(400, 'Name not exist.')
      console.warn(`Resolve name error: ${await response.text()}`)
    }
    request.params.address = await response.text()
  }

  const { params: { address, filename } } = request
  if (!isHex(address)) return error(400, 'Address should be like `0x${string}`')
  request.params.address = address.toLowerCase()
  if (filename !== undefined) {
    request.params.filename = decodeURIComponent(filename)
  }
}

export async function withAuth(request: IRequest, env: Env) {
  const { params: { address } } = request
  if (!isHex(address)) return error(400, 'Invalid address.')

  const [scheme, token] = request.headers.get('Authorization')?.split(' ') ?? []
  if (scheme !== 'Signature') return error(401, 'Missing or malformed authorization token.')

  const [messageB64, signature] = token.split(':')
  if (!isHex(signature)) return error(401, 'Malformed token.')

  const message = atob(messageB64)
  if (!await publicClient.verifyMessage({ address, message, signature })) return error(403, 'Invalid signature.')

  const pastDue = await env.files.get(`${address}/bills/past_due`)
  if (pastDue !== null) return error(402, 'Account has past-due bill.')

  const usage = await addUsage(address, 0, env)
  if (usage === 0n && pastDue === null) await env.files.delete(`address/${address}`)
  else await env.files.put(`addresses/${address}`, '')
}
