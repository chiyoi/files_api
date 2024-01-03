import { createPublicClient, createWalletClient, getContract, http, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import BillingAccount from '@/abi/BillingAccount'

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
})

export const walletClient = (env: EnvBillingOwnerPrivateKey) => {
  const account = privateKeyToAccount(env.BILLING_OWNER_PRIVATE_KEY)
  return [account, createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  })] as const
}

export const billingContract = (walletClient: WalletClient, env: EnvBillingContractAddress) => getContract({
  address: env.BILLING_CONTRACT_ADDRESS,
  abi: BillingAccount,
  publicClient: walletClient,
  walletClient,
})

type EnvBillingContractAddress = {
  BILLING_CONTRACT_ADDRESS: `0x${string}`,
}

type EnvBillingOwnerPrivateKey = {
  BILLING_OWNER_PRIVATE_KEY: `0x${string}`,
}
