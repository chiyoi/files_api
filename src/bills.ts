import { IRequest, json } from 'itty-router'
import { Env } from '@/src'
import { z } from 'zod'

const PRICE_WEI_PER_SECOND_BYTE = 0.02

export async function getCurrentPeriodBill(request: IRequest, env: Env) {
  const { params: { address } } = request
  const usage = await checkUsage(address, env) ?? 0
  return json(usage * PRICE_WEI_PER_SECOND_BYTE)
}

export async function checkUsage(address: string, env: Env, newUsage?: number) {
  const usage = await (await env.files.get(`${address}/usage`))
  if (usage === null) return
  const { current, checked, timestamp } = z.object({
    current: z.number(),
    checked: z.number(),
    timestamp: z.number(),
  }).parse(await usage.json())
  const now = Date.now()
  const newChecked = checked + current * (now - timestamp)
  await env.files.put(`${address}/usage`, JSON.stringify({
    current: newUsage ?? current,
    checked: newChecked,
    timestamp: now,
  }))
  return newChecked
}
