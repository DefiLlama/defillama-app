import type { NextApiRequest, NextApiResponse } from 'next'
import { chartDatasetsBySlug } from '~/containers/Downloads/chart-datasets'
import { validateSubscription } from '~/utils/apiAuth'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

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

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { dataset: datasetSlug, param } = req.query
	if (typeof datasetSlug !== 'string') {
		return res.status(400).json({ error: 'Invalid dataset parameter' })
	}

	const dataset = chartDatasetsBySlug.get(datasetSlug)
	if (!dataset) {
		return res.status(404).json({ error: `Chart dataset "${datasetSlug}" not found` })
	}

	if (typeof param !== 'string' || !param.trim()) {
		return res.status(400).json({ error: 'Missing required "param" query parameter' })
	}

	try {
		const auth = await validateSubscription(req.headers.authorization)
		const isPreview = auth.valid === false

		if (!isPreview && auth.valid && auth.isTrial) {
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

		if (isPreview) {
			rows = rows.slice(-10)
		}

		const csv = rowsToCsv(rows)

		const filename = `${datasetSlug}_${sanitizeFilenameParam(param)}.csv`
		res.setHeader('Content-Type', 'text/csv; charset=utf-8')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.setHeader('Cache-Control', 'private, no-store')
		if (isPreview) {
			res.setHeader('X-Preview', 'true')
		}
		return res.status(200).send(csv)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Internal server error' })
	}
}

export default withApiRouteTelemetry('/api/downloads/chart/[dataset]', handler)
