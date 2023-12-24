import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { Env } from '@/src'

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
})

export function WalletClient(env: Env) {
  const account = privateKeyToAccount(env.BILLING_CONTRACT_OWNER_PRIVATE_KEY)
  return createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  })
}
