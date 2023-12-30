import { IRequest, json } from 'itty-router'
import { Env } from '@/src'
import { z } from 'zod'
import { billingContract, walletClient } from '@/src/wallets'
import { isHex } from 'viem'
import { sepolia } from 'viem/chains'

const PRICE_WEI_PER_SECOND_BYTE = 0.02

export async function handleGetCurrentPeriodBill(request: IRequest, env: Env) {
  const { params: { address } } = request
  const usage = await checkUsage(address, env) ?? 0
  return json({ amount: usage * PRICE_WEI_PER_SECOND_BYTE })
}

export async function handleGetPastDueBill(request: IRequest, env: Env) {
  const { params: { address } } = request
  const amount = await (await env.files.get(`${address}/bills/pass_due`))?.text()
  return json({ amount: Number(amount) ?? 0 })
}

export async function handlePastDuePaid(request: IRequest, env: Env) {
  const { params: { address } } = request
  const pastDue = await (await env.files.get(`${address}/bills/past_due`))?.text()
  if (pastDue === undefined) return
  await charge(address, Number(pastDue), env)
  await env.files.delete(`${address}/bills/past_due`)
  return
}

export async function chargeAll(env: Env) {
  const prefix = 'addresses/'
  const addresses = await env.files.list({ prefix })
  addresses.objects
    .map(object => object.key.slice(prefix.length))
    .forEach(async address => {
      const pastDue = await (await env.files.get(`${address}/bills/past_due`))?.text()
      if (pastDue !== undefined) {
        try { await charge(address, Number(pastDue), env) }
        catch (error) {
          console.warn(error)
          return false
        }
        return
      }

      const usage = await checkUsage(address, env)
      if (usage === undefined) return
      const amount = usage * PRICE_WEI_PER_SECOND_BYTE
      try { await charge(address, amount, env) }
      catch (error) {
        console.warn(error)
        await env.files.put(`${address}/bills/past_due`, String(amount))
      }
    })
}

export async function charge(address: string, amount: number, env: Env) {
  if (!isHex(address)) throw new Error('Address should be hex.')
  const [account, client] = walletClient(env)
  const contract = billingContract(client, env)
  await contract.write.charge([address, BigInt(amount)], {
    account: account.address,
    chain: sepolia,
  })
}

export async function checkUsage(address: string, env: Env, newUsage?: number) {
  const usage = await (await env.files.get(`${address}/bills/usage`))
  if (usage === null) return
  const { current, checked, timestamp } = Usage.parse(await usage.json())
  const now = Date.now()
  const newChecked = checked + current * (now - timestamp)
  await env.files.put(`${address}/bills/usage`, JSON.stringify({
    current: newUsage ?? current,
    checked: newChecked,
    timestamp: now,
  }))
  return newChecked
}

const Usage = z.object({
  current: z.number(),
  checked: z.number(),
  timestamp: z.number(),
})
