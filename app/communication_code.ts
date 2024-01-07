import { Env } from '@/src'
import { IRequest, json } from 'itty-router'

export const handleGetCommunicationCode = async (request: IRequest, env: Env) => {
  const { params: { address } } = request
  const communication_code = await (await env.files.get(`${address}/communication_code`))?.text()
  return new Response(communication_code ?? '')
}

export const handleSetCommunicationCode = async (request: IRequest, env: Env) => {
  const { params: { address } } = request
  const communication_code = await request.text()
  if (communication_code === '') await env.files.delete(`${address}/communication_code`)
  else await env.files.put(`${address}/communication_code`, communication_code)
  return json({ set: { address, communication_code } })
}
