import { describe, test } from '@jest/globals'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { z } from 'zod'
import * as assert from 'assert'

const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')

const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http()
})

describe('Billing APIs', () => {
  const address = account.address
  const message = 'test-message'

  test('current period bill', async () => {
    const headers = {
      Authorization: `Signature ${btoa(message)}:${await client.signMessage({ message })}`
    }

    const currentPeriodBill1 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill1.ok) assert.fail(await currentPeriodBill1.text())
    const { amount: amount1 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill1.json())
    console.log(`Amount before: ${amount1}`)

    const filename = 'nyan'
    const startUploadFile = await fetch(`http://localhost:8787/api/${address}/extra_large_files/${filename}/uploads`, {
      method: 'POST',
      headers,
    })
    if (!startUploadFile.ok) assert.fail(await startUploadFile.text())
    const { upload_id } = z.object({ upload_id: z.string() }).parse(await startUploadFile.json())

    const file = Array(1000).fill('a').join('')
    const uploadFilePart = await fetch(`http://localhost:8787/api/${address}/extra_large_files/${filename}/uploads/${upload_id}/parts/${1}`, {
      method: 'PUT',
      headers,
      body: file,
    })
    if (!uploadFilePart.ok) assert.fail(await uploadFilePart.text())
    const uploaded = z.object({
      partNumber: z.number(),
      etag: z.string(),
    }).parse(await uploadFilePart.json())

    const complete = await fetch(`http://localhost:8787/api/${address}/extra_large_files/${filename}/uploads/${upload_id}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify([uploaded])
    })
    if (!complete.ok) assert.fail(await complete.text())
    const { completed } = z.object({ completed: z.string() }).parse(await complete.json())
    console.log(`Completed: ${completed}`)

    await new Promise(resolve => { setTimeout(resolve, 3000) })

    const currentPeriodBill2 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill2.ok) assert.fail(await currentPeriodBill2.text())
    const { amount: amount2 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill2.json())
    console.log(`Amount after: ${amount2}`)
    console.log(`Amount diff: ${amount2 - amount1}`)
  })
})
