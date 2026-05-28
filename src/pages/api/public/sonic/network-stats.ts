import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchJson } from '~/utils/async'

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api'
const CHAIN_ID = 146
const API_KEY = 'U7FNUA3JZ3VGYGBKDQJCUZ5KX3PUNKZMW5'
const BURN_API = 'https://burn.soniclabs.com/api/data'
const TIMEOUT = { timeout: 15_000 }

function etherscanUrl(module: string, action: string) {
	return `${ETHERSCAN_BASE}?chainid=${CHAIN_ID}&module=${module}&action=${action}&apikey=${API_KEY}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const results = await Promise.allSettled([
			fetchJson<{ result: string }>(etherscanUrl('proxy', 'eth_blockNumber'), TIMEOUT),
			fetchJson<{ result: string }>(etherscanUrl('proxy', 'eth_gasPrice'), TIMEOUT),
			fetchJson<{ result: string }>(etherscanUrl('stats', 'ethsupply'), TIMEOUT),
			fetchJson<Record<string, unknown>>(BURN_API, TIMEOUT)
		])

		const blockNumber = results[0].status === 'fulfilled' ? parseInt(results[0].value.result, 16) : null
		const gasPriceWei = results[1].status === 'fulfilled' ? parseInt(results[1].value.result, 16) : null
		const totalSupplyWei = results[2].status === 'fulfilled' ? results[2].value.result : null
		const burnData = results[3].status === 'fulfilled' ? results[3].value : null

		res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
		return res.status(200).json({
			blockNumber,
			gasPrice: gasPriceWei != null ? { gwei: gasPriceWei / 1e9, wei: gasPriceWei } : null,
			totalSupplyWei,
			burnData,
			uptimeUrl: 'https://uptime.soniclabs.com/'
		})
	} catch (error) {
		console.error('Sonic network-stats proxy error:', error)
		return res.status(502).json({ error: 'Failed to fetch upstream data' })
	}
}
