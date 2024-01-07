import { describe, test } from '@jest/globals'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import * as assert from 'assert'

const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')

const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http()
})

const address = account.address
const message = 'test-message'
const code = 'test-code'

const HeadersWithoutCode = async () => ({
  Authorization: `Signature ${btoa(message)}:${await client.signMessage({ message })}`
})

const Headers = async () => ({
  Authorization: `Signature ${btoa(message + code)}:${await client.signMessage({ message: message + code })}`
})

describe.skip('Communication Code', () => {
  test('get, set', async () => {
    const headers = await Headers()
    const set = await fetch(`http://localhost:8787/api/${address}/communication_code`, {
      method: 'PUT',
      headers,
      body: code,
    })
    assert(set.ok, await set.text())

    const got1 = await fetch(`http://localhost:8787/api/${address}/communication_code`)
    assert.equal(await got1.text(), code)

    const withoutCode = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, {
      headers: await HeadersWithoutCode(),
    })
    assert.equal(withoutCode.status, 403)

    const withCode = await fetch(`http://localhost:8787/api/${address}/bills/current_period`, {
      headers,
    })
    assert(withCode.ok, await withCode.text())

    const deleted = await fetch(`http://localhost:8787/api/${address}/communication_code`, {
      method: 'PUT',
      headers,
      body: '',
    })
    assert(deleted.ok, await deleted.text())

    const got2 = await fetch(`http://localhost:8787/api/${address}/communication_code`)
    assert.equal(await got2.text(), '')
  })
})
