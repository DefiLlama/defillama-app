import type { NextApiRequest, NextApiResponse } from 'next'
import { SERVER_URL, V2_SERVER_URL } from '~/constants'
import { chartDatasetsBySlug } from '~/containers/Downloads/chart-datasets'
import { slug as toSlug } from '~/utils'
import { validateSubscription } from '~/utils/apiAuth'

function sanitizeFilenameParam(s: string): string {
	return s.replace(/["\r\n;\\]/g, '_').trim()
}

function escapeCsvField(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

function parseCsvLine(line: string): string[] {
	const fields: string[] = []
	let i = 0
	while (i < line.length) {
		if (line[i] === '"') {
			i++
			let field = ''
			while (i < line.length) {
				if (line[i] === '"' && line[i + 1] === '"') {
					field += '"'
					i += 2
				} else if (line[i] === '"') {
					i++
					break
				} else {
					field += line[i]
					i++
				}
			}
			fields.push(field)
			if (i < line.length && line[i] === ',') i++
		} else {
			let field = ''
			while (i < line.length && line[i] !== ',') {
				field += line[i]
				i++
			}
			fields.push(field)
			if (i < line.length && line[i] === ',') i++
			else break
		}
	}
	return fields
}

function ddmmyyyyToIso(ddmmyyyy: string): string | null {
	const m = ddmmyyyy.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
	if (!m) return null
	const [, dd, mm, yyyy] = m
	return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function timestampToIsoDate(ts: number): string {
	const ms = ts < 1e12 ? ts * 1000 : ts
	return new Date(ms).toISOString().slice(0, 10)
}

function buildWideCsv(headers: string[], rows: Array<Record<string, string>>): string {
	const lines = [headers.map(escapeCsvField).join(',')]
	for (const row of rows) {
		const line = headers.map((h) => escapeCsvField(row[h] ?? '')).join(',')
		lines.push(line)
	}
	return lines.join('\r\n')
}

async function buildTvlBreakdownCsv(
	category: string
): Promise<{ headers: string[]; rows: Array<Record<string, string>> } | null> {
	const url = `${SERVER_URL}/simpleChainDataset/All?category=${encodeURIComponent(category)}`
	const upstream = await fetch(url)
	if (!upstream.ok) return null
	const text = await upstream.text()
	const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
	if (lines.length < 2) return null

	const rawHeaders = parseCsvLine(lines[0])
	if (rawHeaders.length < 2) return null
	const dateColumns = rawHeaders.slice(1)
	const isoDates = dateColumns.map(ddmmyyyyToIso)

	const protocols: string[] = []
	const perProtocolValues: string[][] = []

	for (let i = 1; i < lines.length; i++) {
		const cells = parseCsvLine(lines[i])
		const name = cells[0]?.trim()
		if (!name) continue
		if (name === 'Total') continue
		protocols.push(name)
		perProtocolValues.push(cells.slice(1))
	}

	if (protocols.length === 0) return null

	const headers = ['date', ...protocols]
	const rows: Array<Record<string, string>> = []

	for (let d = 0; d < isoDates.length; d++) {
		const iso = isoDates[d]
		if (!iso) continue
		const row: Record<string, string> = { date: iso }
		for (let p = 0; p < protocols.length; p++) {
			const v = perProtocolValues[p][d] ?? ''
			row[protocols[p]] = v
		}
		rows.push(row)
	}

	rows.sort((a, b) => a.date.localeCompare(b.date))

	return { headers, rows }
}

async function buildDimensionBreakdownCsv(
	adapterType: string,
	dataType: string | undefined,
	category: string
): Promise<{ headers: string[]; rows: Array<Record<string, string>> } | null> {
	const dtQs = dataType ? `dataType=${encodeURIComponent(dataType)}` : ''
	const breakdownUrl = `${V2_SERVER_URL}/chart/${adapterType}/protocol-breakdown${dtQs ? `?${dtQs}` : ''}`
	const overviewUrl = `${SERVER_URL}/overview/${adapterType}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true${dtQs ? `&${dtQs}` : ''}`

	const [breakdownResp, overviewResp] = await Promise.all([fetch(breakdownUrl), fetch(overviewUrl)])
	if (!breakdownResp.ok || !overviewResp.ok) return null

	const [breakdownJson, overviewJson] = await Promise.all([breakdownResp.json(), overviewResp.json()])

	const categorySlug = toSlug(category)
	const allowedProtocols = new Set<string>()
	const protocols = Array.isArray(overviewJson?.protocols) ? overviewJson.protocols : []
	for (const p of protocols) {
		const name = typeof p?.name === 'string' ? p.name : ''
		const cat = typeof p?.category === 'string' ? p.category : ''
		if (!name || !cat) continue
		if (cat === category || toSlug(cat) === categorySlug) {
			allowedProtocols.add(name)
		}
	}

	if (allowedProtocols.size === 0) return null
	if (!Array.isArray(breakdownJson)) return null

	const dateToValues = new Map<string, Map<string, number>>()
	const seenProtocols = new Set<string>()

	for (const entry of breakdownJson) {
		if (!Array.isArray(entry) || entry.length < 2) continue
		const ts = Number(entry[0])
		const valueMap = entry[1]
		if (!Number.isFinite(ts) || !valueMap || typeof valueMap !== 'object' || Array.isArray(valueMap)) continue
		const iso = timestampToIsoDate(ts)
		let row = dateToValues.get(iso)
		if (!row) {
			row = new Map()
			dateToValues.set(iso, row)
		}
		for (const [proto, raw] of Object.entries(valueMap as Record<string, unknown>)) {
			if (!allowedProtocols.has(proto)) continue
			const num = typeof raw === 'number' ? raw : Number(raw)
			if (!Number.isFinite(num)) continue
			row.set(proto, (row.get(proto) ?? 0) + num)
			seenProtocols.add(proto)
		}
	}

	if (seenProtocols.size === 0) return null

	const protocolList = [...seenProtocols].sort((a, b) => a.localeCompare(b))
	const headers = ['date', ...protocolList]

	const rows: Array<Record<string, string>> = []
	const sortedDates = [...dateToValues.keys()].sort()
	for (const iso of sortedDates) {
		const valueRow = dateToValues.get(iso)!
		const out: Record<string, string> = { date: iso }
		for (const proto of protocolList) {
			const v = valueRow.get(proto)
			out[proto] = v === undefined ? '' : String(v)
		}
		rows.push(out)
	}

	return { headers, rows }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { slug: datasetSlug, category } = req.query
	if (typeof datasetSlug !== 'string') {
		return res.status(400).json({ error: 'Invalid dataset parameter' })
	}

	const dataset = chartDatasetsBySlug.get(datasetSlug)
	if (!dataset) {
		return res.status(404).json({ error: `Chart dataset "${datasetSlug}" not found` })
	}

	if (!dataset.categoryBreakdown) {
		return res.status(400).json({ error: `Chart dataset "${datasetSlug}" does not support category breakdown` })
	}

	if (typeof category !== 'string' || !category.trim()) {
		return res.status(400).json({ error: 'Missing required "category" query parameter' })
	}

	try {
		const auth = await validateSubscription(req.headers.authorization)
		const isPreview = auth.valid === false

		if (!isPreview && auth.valid && auth.isTrial) {
			return res.status(403).json({ error: 'CSV downloads are available only for paid users.' })
		}

		const bd = dataset.categoryBreakdown
		const result =
			bd.kind === 'tvl'
				? await buildTvlBreakdownCsv(category.trim())
				: await buildDimensionBreakdownCsv(bd.adapterType, bd.dataType, category.trim())

		if (!result || result.rows.length === 0) {
			return res.status(404).json({ error: 'No data returned for the specified category' })
		}

		let { headers, rows } = result
		if (isPreview) {
			rows = rows.slice(-10)
		}

		const csv = buildWideCsv(headers, rows)

		const filename = `${datasetSlug}_${sanitizeFilenameParam(toSlug(category))}.csv`
		res.setHeader('Content-Type', 'text/csv; charset=utf-8')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.setHeader('Cache-Control', 'private, no-store')
		if (isPreview) {
			res.setHeader('X-Preview', 'true')
		}
		return res.status(200).send(csv)
	} catch (error) {
		console.error(`Chart breakdown downloads proxy error (${datasetSlug}):`, error)
		return res.status(500).json({ error: 'Internal server error' })
	}
}
