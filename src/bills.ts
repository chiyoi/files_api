import { IRequest, json } from 'itty-router'
import { Env } from '@/src'
import { z } from 'zod'
import { isHex } from 'viem'
import { sepolia } from 'viem/chains'
import { billingContract, walletClient } from '@/src/auth'

const PRICE_WEI_PER_SECOND_BYTE_DENO = 50n

export async function handleGetCurrentPeriodBill(request: IRequest, env: Env) {
  const { params: { address } } = request
  const usage = await addUsage(address, 0, env)
  return json({ amount: String(usage / PRICE_WEI_PER_SECOND_BYTE_DENO) })
}

export async function handleGetPastDueBill(request: IRequest, env: Env) {
  const { params: { address } } = request
  const amount = await (await env.files.get(`${address}/bills/pass_due`))?.text()
  return json({ amount: amount ?? '0' })
}

export async function handlePastDuePaid(request: IRequest, env: Env) {
  const { params: { address } } = request
  const pastDue = await (await env.files.get(`${address}/bills/past_due`))?.text()
  if (pastDue === undefined) return
  await charge(address, BigInt(pastDue), env)
  await env.files.delete(`${address}/bills/past_due`)
}

export async function chargeAll(env: Env) {
  const prefix = 'addresses/'
  const addresses = await env.files.list({ prefix })
  addresses.objects
    .map(object => object.key.slice(prefix.length))
    .forEach(async address => {
      const pastDue = await (await env.files.get(`${address}/bills/past_due`))?.text()
      if (pastDue !== undefined) {
        try { await charge(address, BigInt(pastDue), env) }
        catch (error) {
          console.warn(error)
          return false
        }
        return
      }

      const usage = await addUsage(address, 0, env)
      if (usage === 0n) return
      const amount = usage / PRICE_WEI_PER_SECOND_BYTE_DENO
      try { await charge(address, amount, env) }
      catch (error) {
        console.warn(error)
        await env.files.put(`${address}/bills/past_due`, String(amount))
      }
    })
}

export async function charge(address: string, amount: bigint, env: Env) {
  if (!isHex(address)) throw new Error('Address should be hex.')
  const [account, client] = walletClient(env)
  const contract = billingContract(client, env)
  await contract.write.charge([address, amount], {
    account: account.address,
    chain: sepolia,
  })
}

export async function addUsage(address: string, offset: number, env: Env) {
  const usage = await (await env.files.get(`${address}/bills/usage`))
  let { current, checked, timestamp } = Usage.parse(await usage?.json() ?? {
    current: 0,
    checked: '0',
    timestamp: 0,
  })
  const now = Math.ceil(Date.now() / 1000)
  if (current !== 0) {
    checked += BigInt(current * (now - timestamp))
  }
  current += offset
  if (current === 0 && checked === 0n) await env.files.delete(`${address}/bills/usage`)
  else await env.files.put(`${address}/bills/usage`, JSON.stringify({
    current,
    checked: String(checked),
    timestamp: now,
  }))
  return checked
}

const Usage = z.object({
  current: z.number(),
  checked: z.coerce.bigint(),
  timestamp: z.number(),
})
