import { describe, test, expect } from '@jest/globals'
import { createWalletClient, http } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { z } from 'zod'
import { billingContract } from '@/src/helpers'

const account = mnemonicToAccount('slight type universe copper sing flash gospel bubble mix angle stumble social')

const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http()
})

const contract = billingContract(client, {
  BILLING_CONTRACT_ADDRESS: '0x377e2782Fc6284C3c085c32EF0fAe1471CB10416',
})

const address = account.address
const message = 'test-message'

const Headers = async () => ({
  Authorization: `Signature ${btoa(message)}:${await client.signMessage({ message })}`
})

describe.skip('Bills', () => {
  test.only('bills calculation with files', async () => {
    const headers = await Headers()
    const currentPeriodBill1 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill1.ok) throw new Error(await currentPeriodBill1.text())
    const { amount: amount1 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill1.json())
    console.log(`Amount before: ${amount1}`)

    const filename = 'nyan'
    const file = Array(1000).fill('a').join('')
    const put = await fetch(`http://localhost:8787/api/${address}/files/${filename}`, {
      method: 'PUT',
      headers,
      body: file,
    })
    if (!put.ok) throw new Error(await put.text())
    const { put: { key, cid } } = z.object({ put: z.object({ key: z.string(), cid: z.string() }) }).parse(await put.json())
    console.log(`Put: ${key} (${cid})`)

    await new Promise(resolve => { setTimeout(resolve, 3000) })

    const currentPeriodBill2 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill2.ok) throw new Error(await currentPeriodBill2.text())
    const { amount: amount2 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill2.json())
    console.log(`Amount after: ${amount2}`)
    const bill = Number(amount2 - amount1)
    console.log(`Bill: ${bill}`)

    const deleted = await fetch(`http://localhost:8787/api/${address}/files/${filename}`, {
      method: 'DELETE',
      headers,
    })
    if (!deleted.ok) throw new Error(await deleted.text())
  })

  test('bills calculation with large_files', async () => {
    const headers = await Headers()
    const currentPeriodBill1 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill1.ok) throw new Error(await currentPeriodBill1.text())
    const { amount: amount1 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill1.json())
    console.log(`Amount before: ${amount1}`)

    const filename = 'nyan'
    const startUploadFile = await fetch(`http://localhost:8787/api/${address}/large_files/${filename}/uploads`, {
      method: 'POST',
      headers,
    })
    if (!startUploadFile.ok) throw new Error(await startUploadFile.text())
    const { upload_id } = z.object({ upload_id: z.string() }).parse(await startUploadFile.json())

    const file = Array(1000).fill('a').join('')
    const uploadFilePart = await fetch(`http://localhost:8787/api/${address}/large_files/${filename}/uploads/${upload_id}/parts/${1}`, {
      method: 'PUT',
      headers,
      body: file,
    })
    if (!uploadFilePart.ok) throw new Error(await uploadFilePart.text())
    const uploaded = z.object({
      partNumber: z.number(),
      etag: z.string(),
    }).parse(await uploadFilePart.json())

    const complete = await fetch(`http://localhost:8787/api/${address}/large_files/${filename}/uploads/${upload_id}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify([uploaded])
    })
    if (!complete.ok) throw new Error(await complete.text())
    const { completed } = z.object({ completed: z.string() }).parse(await complete.json())
    console.log(`Completed: ${completed}`)

    await new Promise(resolve => { setTimeout(resolve, 3000) })

    const currentPeriodBill2 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill2.ok) throw new Error(await currentPeriodBill2.text())
    const { amount: amount2 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill2.json())
    console.log(`Amount after: ${amount2}`)
    const bill = Number(amount2 - amount1)
    const expectedBill = 1000 * 3 / 50
    expect(Math.abs(bill - expectedBill)).toBeLessThan(10)

    const deleted = await fetch(`http://localhost:8787/api/${address}/large_files/${filename}`, {
      method: 'DELETE',
      headers,
    })
    if (!deleted.ok) throw new Error(await deleted.text())
  })

  test('charge all and pay past due', async () => {
    const headers = await Headers()
    const balance1 = await contract.read.balance([address])
    const { request: withdraw } = await contract.simulate.withdraw([balance1])
    await client.writeContract(withdraw)

    const filename = 'nyan'
    const file = Array(1000).fill('a').join('')
    const put = await fetch(`http://localhost:8787/api/${address}/files/${filename}`, {
      method: 'PUT',
      headers,
      body: file,
    })
    if (!put.ok) throw new Error(await put.text())
    const { put: { key, cid } } = z.object({ put: z.object({ key: z.string(), cid: z.string() }) }).parse(await put.json())
    console.log(`Put: ${key} (${cid})`)

    await new Promise(resolve => { setTimeout(resolve, 3000) })

    const currentPeriodBill1 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill1.ok) throw new Error(await currentPeriodBill1.text())
    const { amount: amount1 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill1.json())
    console.log(`Amount: ${amount1}`)

    await fetch(`http://localhost:8787/__scheduled?cron=${encodeURIComponent('0 0 1 * *')}`)

    const currentPeriodBill2 = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, { headers })
    if (!currentPeriodBill2.ok) throw new Error(await currentPeriodBill1.text())
    const { amount: amount2 } = z.object({ amount: z.coerce.bigint() }).parse(await currentPeriodBill1.json())
    expect(amount2).toBe(0n)

    const pastDue = await fetch(`http://localhost:8787/api/${address}/bills/past_due`, { headers })
    if (!pastDue.ok) throw new Error(await pastDue.text())
    expect(BigInt(await pastDue.text())).toBe(amount1)

    const { request: deposit } = await contract.simulate.deposit({ value: amount1 })
    await client.writeContract(deposit)

    const paid = await fetch(`http://localhost:8787/api/${address}/bills/past_due_paid`, {
      method: 'POST',
      headers,
    })
    if (!paid.ok) throw new Error(await paid.text())
    const { paid: { amount: amount3 } } = z.object({ paid: z.object({ amount: z.coerce.bigint() }) }).parse(await paid.json())
    expect(amount1).toBe(amount3)

    const balance2 = await contract.read.balance([address])
    expect(balance2).toBe(0n)
  })
})
