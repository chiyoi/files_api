import { IRequest, json } from 'itty-router'
import { Env } from '@/src'
import { z } from 'zod'
import { isHex } from 'viem'
import { billingContract, error, walletClient } from '@/src/internal'

const PRICE_WEI_PER_SECOND_BYTE_DENOMINATOR = 50n

export const handleGetCurrentPeriodBill = async (request: IRequest, env: Env) => {
  const { params: { address } } = request
  const usage = await checkUsage(address, env)
  return json({ amount: String(usage / PRICE_WEI_PER_SECOND_BYTE_DENOMINATOR) })
}

export const handleGetPastDueBill = async (request: IRequest, env: Env) => {
  const { params: { address } } = request
  const amount = await (await env.files.get(`${address}/bills/past_due`))?.text()
  return json({ amount: amount ?? '0' })
}

export const handlePastDuePaid = async (request: IRequest, env: Env) => {
  const { params: { address } } = request
  const pastDue = await (await env.files.get(`${address}/bills/past_due`))?.text()
  if (pastDue === undefined) return error(404, 'No past due bill.')
  await charge(address, BigInt(pastDue), env)
  await env.files.delete(`${address}/bills/past_due`)
  return json({ paid: { amount: pastDue } })
}

export const chargeAll = async (env: Env) => {
  const prefix = 'addresses/'
  const addresses = await env.files.list({ prefix })
  await Promise.all(addresses.objects
    .map(object => object.key.slice(prefix.length))
    .map(async address => {
      const pastDue = await (await env.files.get(`${address}/bills/past_due`))?.text()
      if (pastDue !== undefined) {
        try { await charge(address, BigInt(pastDue), env) }
        catch (error) { console.warn(error) }
        return
      }

      const usage = await checkUsage(address, env, 0, true)
      if (usage === 0n) return
      const amount = usage / PRICE_WEI_PER_SECOND_BYTE_DENOMINATOR
      try { await charge(address, amount, env) }
      catch (error) {
        console.warn(error)
        await env.files.put(`${address}/bills/past_due`, String(amount))
      }
    }))
}

export const charge = async (address: string, amount: bigint, env: Env) => {
  if (!isHex(address)) throw new Error('Address should be hex.')
  const client = walletClient(env)
  const contract = billingContract(client, env)
  const { request } = await contract.simulate.charge([address, amount])
  await client.writeContract(request)
}

export const checkUsage = async (address: string, env: Env, addCurrent?: number, clearChecked?: boolean,) => {
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
  current += addCurrent ?? 0
  if (current === 0 && checked === 0n) {
    await env.files.delete(`${address}/bills/usage`)
    await env.files.delete(`address/${address}`)
  }
  else await env.files.put(`${address}/bills/usage`, JSON.stringify({
    current,
    checked: clearChecked ? '0' : String(checked),
    timestamp: now,
  }))
  return checked
}

const Usage = z.object({
  current: z.number(),
  checked: z.coerce.bigint(),
  timestamp: z.number(),
})
