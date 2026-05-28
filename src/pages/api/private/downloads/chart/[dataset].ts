import type { NextApiRequest, NextApiResponse } from 'next'
import { chartDatasetsBySlug, type ChartDatasetDefinition } from '~/containers/Downloads/chart-datasets'
import { withDownloadRoute, type DownloadAccess } from '~/server/api/withDownloadRoute'
import { fetchWithPoolingOnServer } from '~/utils/http-client'

function sanitize(s: string): string {
	return s.replace(/[\r\n]+/g, ' ').trim()
}

function sanitizeFilenameParam(s: string): string {
	return s.replace(/["\r\n;\\]/g, '_').trim()
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

function rowsToCsv(rows: Array<Record<string, unknown>>): string {
	if (rows.length === 0) return ''

	const keySet = new Set<string>()
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			keySet.add(key)
		}
	}

	const priorityKeys = ['date']
	const headers = [
		...priorityKeys.filter((k) => keySet.has(k)),
		...[...keySet].filter((k) => !priorityKeys.includes(k))
	]

	const lines = [headers.map(escapeCsvField).join(',')]
	for (const row of rows) {
		const csvRow = headers.map((key) => {
			const val = row[key]
			if (key === 'date' && (typeof val === 'number' || (typeof val === 'string' && /^\d+$/.test(val)))) {
				const num = Number(val)
				const ms = num < 1e12 ? num * 1000 : num
				return escapeCsvField(new Date(ms).toISOString().slice(0, 10))
			}
			return escapeCsvField(safeVal(val))
		})
		lines.push(csvRow.join(','))
	}
	return lines.join('\r\n')
}

function getRouteParams(req: NextApiRequest, res: NextApiResponse) {
	const { dataset: datasetSlug, param } = req.query
	if (typeof datasetSlug !== 'string') {
		res.status(400).json({ error: 'Invalid dataset parameter' })
		return null
	}

	const dataset = chartDatasetsBySlug.get(datasetSlug)
	if (!dataset) {
		res.status(404).json({ error: `Chart dataset "${datasetSlug}" not found` })
		return null
	}

	if (typeof param !== 'string' || !param.trim()) {
		res.status(400).json({ error: 'Missing required "param" query parameter' })
		return null
	}

	return { datasetSlug, dataset, param }
}

async function handler(
	_req: NextApiRequest,
	res: NextApiResponse,
	access: DownloadAccess,
	{ datasetSlug, dataset, param }: { datasetSlug: string; dataset: ChartDatasetDefinition; param: string }
) {
	if (access === 'trial') {
		return res.status(403).json({ error: 'CSV downloads are available only for paid users.' })
	}

	let rows: Array<Record<string, unknown>>
	if (dataset.customFetch) {
		rows = await dataset.customFetch(param.trim())
	} else {
		const fetchUrl = dataset.buildUrl(param.trim())
		const upstream = await fetchWithPoolingOnServer(fetchUrl)
		if (!upstream.ok) {
			return res.status(502).json({ error: `Upstream API returned ${upstream.status}` })
		}
		const json = await upstream.json()
		rows = dataset.extractRows(json)
	}

	if (rows.length === 0) {
		return res.status(404).json({ error: 'No data returned for the specified parameter' })
	}

	if (access === 'preview') {
		rows = rows.slice(-10)
	}

	const csv = rowsToCsv(rows)

	const filename = `${datasetSlug}_${sanitizeFilenameParam(param)}.csv`
	res.setHeader('Content-Type', 'text/csv; charset=utf-8')
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
	if (access === 'preview') {
		res.setHeader('X-Preview', 'true')
	}
	return res.status(200).send(csv)
}

export default withDownloadRoute({
	route: '/api/private/downloads/chart/[dataset]',
	getRouteParams,
	handler
})
