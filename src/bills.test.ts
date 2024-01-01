import { describe, test } from '@jest/globals'
import { createWalletClient, http } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { z } from 'zod'
import * as assert from 'assert'
import { billingContract } from '@/src/auth'

const account = mnemonicToAccount('slight type universe copper sing flash gospel bubble mix angle stumble social')

const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http()
})

const contract = billingContract(client, {
  BILLING_CONTRACT_ADDRESS: '0x377e2782Fc6284C3c085c32EF0fAe1471CB10416',
})

describe('Bills', async () => {
  const address = account.address
  const message = 'test-message'

  const headers = {
    Authorization: `Signature ${btoa(message)}:${await client.signMessage({ message })}`
  }

  test('bills calculation with files', async () => {
    const currentPeriodBill1 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill1.ok) assert.fail(await currentPeriodBill1.text())
    const { amount: amount1 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill1.json())
    console.log(`Amount before: ${amount1}`)

    const filename = 'nyan'
    const file = Array(1000).fill('a').join('')

    const put = await fetch(`http://localhost:8787/api/${address}/files/${filename}`, {
      method: 'PUT',
      headers,
      body: file,
    })
    if (!put.ok) assert.fail(await put.text())
    const { put: { key, cid } } = z.object({ put: z.object({ key: z.string(), cid: z.string() }) }).parse(await put.json())
    console.log(`Put: ${key} (${cid})`)

    await new Promise(resolve => { setTimeout(resolve, 3000) })

    const currentPeriodBill2 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill2.ok) assert.fail(await currentPeriodBill2.text())
    const { amount: amount2 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill2.json())
    console.log(`Amount after: ${amount2}`)
    const bill = Number(amount2 - amount1)
    const expectedBill = (1000 * 3 + 64) / 50
    assert(Math.abs(bill - expectedBill) < 10)

    const deleted = await fetch(`http://localhost:8787/api/${address}/files/${filename}`, {
      method: 'DELETE',
      headers,
    })
    assert(deleted.ok, await deleted.text())
  })

  test('bills calculation with large_files', async () => {
    const currentPeriodBill1 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill1.ok) assert.fail(await currentPeriodBill1.text())
    const { amount: amount1 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill1.json())
    console.log(`Amount before: ${amount1}`)

    const filename = 'nyan'
    const startUploadFile = await fetch(`http://localhost:8787/api/${address}/large_files/${filename}/uploads`, {
      method: 'POST',
      headers,
    })
    if (!startUploadFile.ok) assert.fail(await startUploadFile.text())
    const { upload_id } = z.object({ upload_id: z.string() }).parse(await startUploadFile.json())

    const file = Array(1000).fill('a').join('')
    const uploadFilePart = await fetch(`http://localhost:8787/api/${address}/large_files/${filename}/uploads/${upload_id}/parts/${1}`, {
      method: 'PUT',
      headers,
      body: file,
    })
    if (!uploadFilePart.ok) assert.fail(await uploadFilePart.text())
    const uploaded = z.object({
      partNumber: z.number(),
      etag: z.string(),
    }).parse(await uploadFilePart.json())

    const complete = await fetch(`http://localhost:8787/api/${address}/large_files/${filename}/uploads/${upload_id}/complete`, {
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
    const bill = Number(amount2 - amount1)
    const expectedBill = 1000 * 3 / 50
    assert(Math.abs(bill - expectedBill) < 10)

    const deleted = await fetch(`http://localhost:8787/api/${address}/large_files/${filename}`, {
      method: 'DELETE',
      headers,
    })
    assert(deleted.ok, await deleted.text())
  })

  test('pay past due bill', async () => {
  })
})
