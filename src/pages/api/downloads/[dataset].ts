import type { NextApiRequest, NextApiResponse } from 'next'
import { datasetsBySlug, type DatasetDefinition } from '~/containers/Downloads/datasets'
import { slug as toSlug } from '~/utils'
import { getTrialCsvDownloadCount, trackCsvDownload, validateSubscription } from '~/utils/apiAuth'

function sanitize(s: string): string {
	return s.replace(/[\r\n]+/g, ' ').trim()
}

function safeVal(v: unknown): string {
	if (v === null || v === undefined) return ''
	if (typeof v === 'object') {
		if (Array.isArray(v)) return sanitize(v.join(', '))
		return sanitize(JSON.stringify(v))
	}
	return sanitize(String(v))
}

function escapeCsvField(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

function flattenItemsToCsv(items: any[], fields?: string[]): string {
	if (items.length === 0) return ''

	let headers: string[]

	if (fields && fields.length > 0) {
		headers = fields
	} else {
		const keySet = new Set<string>()
		for (const item of items) {
			if (item && typeof item === 'object' && !Array.isArray(item)) {
				for (const key of Object.keys(item)) {
					keySet.add(key)
				}
			}
		}
		const priorityKeys = ['name', 'displayName']
		headers = [...priorityKeys.filter((k) => keySet.has(k)), ...[...keySet].filter((k) => !priorityKeys.includes(k))]
	}

	const lines = [headers.map(escapeCsvField).join(',')]
	for (const item of items) {
		const row = headers.map((key) => escapeCsvField(safeVal(item?.[key])))
		lines.push(row.join(','))
	}
	return lines.join('\r\n')
}

function insertChainIntoOverviewUrl(baseUrl: string, chain: string): string {
	const url = new URL(baseUrl)
	url.pathname = `${url.pathname}/${toSlug(chain)}`
	return url.toString()
}

function extractChainsForDataset(dataset: DatasetDefinition, json: any): string[] {
	if (dataset.chainFilterType === 'overview') {
		const allChains: unknown = json?.allChains
		if (!Array.isArray(allChains)) return []

		const chainTotals = new Map<string, number>()
		for (const chain of allChains as string[]) {
			chainTotals.set(chain, 0)
		}

		const protocols: any[] = json?.protocols ?? []
		for (const protocol of protocols) {
			const breakdown: Record<string, Record<string, number>> = protocol?.breakdown24h
			if (!breakdown) continue
			for (const [chainSlug, values] of Object.entries(breakdown)) {
				const total = Object.values(values).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0)
				for (const [name, current] of chainTotals) {
					if (toSlug(name) === chainSlug) {
						chainTotals.set(name, current + total)
						break
					}
				}
			}
		}

		return [...chainTotals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
	}

	if (dataset.chainFilterType === 'protocols') {
		const items = dataset.extractItems(json)
		const chainTotals = new Map<string, number>()
		for (const item of items) {
			const chains = item?.chains
			const chainTvls = item?.chainTvls
			if (!Array.isArray(chains)) continue
			for (const c of chains) {
				if (typeof c !== 'string') continue
				const entry = chainTvls?.[c]
				const tvl =
					typeof entry === 'object' && entry !== null ? (entry.tvl ?? 0) : typeof entry === 'number' ? entry : 0
				chainTotals.set(c, (chainTotals.get(c) ?? 0) + tvl)
			}
		}
		return [...chainTotals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
	}

	return []
}

function pctChange(current: number | null | undefined, prev: number | null | undefined): number | null {
	if (current == null || prev == null || prev === 0) return null
	return ((current - prev) / prev) * 100
}

function filterProtocolsByChain(items: any[], chain: string): any[] {
	return items
		.filter((item) => {
			const chains = item?.chains
			return Array.isArray(chains) && chains.includes(chain)
		})
		.map((item) => {
			const entry = item?.chainTvls?.[chain]
			let tvl: number | null = null
			let tvlPrevDay: number | null = null
			let tvlPrevWeek: number | null = null
			let tvlPrevMonth: number | null = null

			if (typeof entry === 'object' && entry !== null) {
				tvl = entry.tvl ?? null
				tvlPrevDay = entry.tvlPrevDay ?? null
				tvlPrevWeek = entry.tvlPrevWeek ?? null
				tvlPrevMonth = entry.tvlPrevMonth ?? null
			} else if (typeof entry === 'number') {
				tvl = entry
			}

			return {
				...item,
				chain,
				tvl,
				tvlPrevDay,
				tvlPrevWeek,
				tvlPrevMonth,
				change_1d: pctChange(tvl, tvlPrevDay),
				change_7d: pctChange(tvl, tvlPrevWeek),
				change_1m: pctChange(tvl, tvlPrevMonth)
			}
		})
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { dataset: datasetSlug, mode, chain } = req.query
	if (typeof datasetSlug !== 'string') {
		return res.status(400).json({ error: 'Invalid dataset parameter' })
	}

	const dataset = datasetsBySlug.get(datasetSlug)
	if (!dataset) {
		return res.status(404).json({ error: `Dataset "${datasetSlug}" not found` })
	}

	try {
		const auth = await validateSubscription(req.headers.authorization)
		const isPreview = auth.valid === false

		const chainParam = typeof chain === 'string' ? chain.trim() : null
		const isChainMode = mode === 'chains'

		if ((isChainMode || chainParam) && !dataset.chainFilterType) {
			return res.status(400).json({ error: `Dataset "${datasetSlug}" does not support chain filtering` })
		}

		const isCsvDownload = !isChainMode
		if (!isPreview && auth.valid && auth.isTrial && isCsvDownload) {
			const csvDownloadCount = await getTrialCsvDownloadCount(req.headers.authorization!)
			if (csvDownloadCount >= 1) {
				return res.status(403).json({ error: 'Trial CSV download limit reached. Upgrade for unlimited downloads.' })
			}
		}

		let fetchUrl = dataset.url
		if (chainParam && dataset.chainFilterType === 'overview') {
			fetchUrl = insertChainIntoOverviewUrl(dataset.url, chainParam)
		}

		const upstream = await fetch(fetchUrl)
		if (!upstream.ok) {
			return res.status(502).json({ error: `Upstream API returned ${upstream.status}` })
		}

		const json = await upstream.json()

		if (isChainMode) {
			const chains = extractChainsForDataset(dataset, json)
			return res.status(200).json({ chains })
		}

		let items = dataset.extractItems(json)

		if (chainParam && dataset.chainFilterType === 'protocols') {
			items = filterProtocolsByChain(items, chainParam)
		}

		if (isPreview) {
			items = items.slice(0, 10)
		}

		const csv = flattenItemsToCsv(items, dataset.fields)

		if (!isPreview && auth.valid && auth.isTrial) {
			await trackCsvDownload(req.headers.authorization!)
		}

		res.setHeader('Content-Type', 'text/csv; charset=utf-8')
		res.setHeader('Content-Disposition', `attachment; filename="${datasetSlug}.csv"`)
		res.setHeader('Cache-Control', 'private, no-store')
		if (isPreview) {
			res.setHeader('X-Preview', 'true')
		}
		return res.status(200).send(csv)
	} catch (error) {
		console.error(`Downloads proxy error (${datasetSlug}):`, error)
		return res.status(500).json({ error: 'Internal server error' })
	}
}
