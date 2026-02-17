import { spawn } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { NextApiRequest, NextApiResponse } from 'next'
import * as duneCache from '~/utils/dune-cache'

const MAPLE_GRAPHQL_URL = 'https://api.maple.finance/v2/graphql'

const QUERIES: Record<string, string> = {
	activePools: `{ poolV2S(where: { activated: true }) { id name asset { symbol decimals } tvlUsd spotApy numOpenTermLoans unrealizedLosses liquidityCap loanManager { principalOut accountedInterest } } }`,
	poolsWithLoans: `{ poolV2S(where: { activated: true, numOpenTermLoans_gt: "0" }) { id name asset { symbol decimals } tvlUsd spotApy numOpenTermLoans openTermLoans(first: 200, where: { principalOwed_gt: "0" }) { id borrower { id } principalOwed interestRate isCalled isImpaired } } }`,
	stSyrupTxes: `{ stSyrupTxes(first: 1000, orderBy: timestamp, orderDirection: desc) { id timestamp type sharesAmount assetsAmount account { id } } }`,
	syrupTxes: `{ syrupTxes(first: 1000, orderBy: timestamp, orderDirection: desc) { id timestamp tokensMigrated account { id } } }`
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const REDIS_TTL_S = 0
const refreshing = new Set<string>()

function cacheKey(queryName: string) {
	return `maple:graphql:${queryName}`
}

function fetchWithCurl(query: string): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const payload = JSON.stringify({ query })
		const tmpFile = join(tmpdir(), `maple-gql-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
		writeFileSync(tmpFile, payload)

		const chunks: Buffer[] = []
		const proc = spawn('curl', ['-s', '-X', 'POST', MAPLE_GRAPHQL_URL, '-H', 'Content-Type: application/json', '-d', `@${tmpFile}`, '--max-time', '25'])

		proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))

		proc.on('close', (code) => {
			try { unlinkSync(tmpFile) } catch {}
			if (code !== 0) return reject(new Error(`curl exited with code ${code}`))
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString()))
			} catch (e) {
				reject(e)
			}
		})

		proc.on('error', (err) => {
			try { unlinkSync(tmpFile) } catch {}
			reject(err)
		})
	})
}

function refreshInBackground(queryName: string) {
	if (refreshing.has(queryName)) return
	refreshing.add(queryName)

	fetchWithCurl(QUERIES[queryName])
		.then((data) => duneCache.set(cacheKey(queryName), { data, fetchedAt: Date.now() }, REDIS_TTL_S))
		.catch(() => {})
		.finally(() => refreshing.delete(queryName))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { queryName } = req.body ?? {}
	if (typeof queryName !== 'string' || !QUERIES[queryName]) {
		return res.status(400).json({ error: 'Invalid query name' })
	}

	const cached = await duneCache.get<{ data: unknown; fetchedAt: number }>(cacheKey(queryName))

	if (cached) {
		const ageMs = Date.now() - cached.fetchedAt
		if (ageMs >= CACHE_TTL_MS) refreshInBackground(queryName)
		res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')
		return res.status(200).json(cached.data)
	}

	try {
		const data = await fetchWithCurl(QUERIES[queryName])
		await duneCache.set(cacheKey(queryName), { data, fetchedAt: Date.now() }, REDIS_TTL_S)

		res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')
		return res.status(200).json(data)
	} catch {
		return res.status(500).json({ error: 'Failed to fetch Maple data' })
	}
}
