import { createPublicClient, createWalletClient, getContract, http, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { Env } from '@/src'
import BillingAccount from '@/abi/BillingAccount'

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
    address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
    abi: BillingAccount,
    walletClient,
  })
}
