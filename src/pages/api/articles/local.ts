import type { NextApiRequest, NextApiResponse } from 'next'
import { normalizeLocalArticleDocument } from '~/containers/Articles/document'
import { readLocalArticleDocument, writeLocalArticleDocument } from '~/containers/Articles/localStorage'
import type { LocalArticleDocument } from '~/containers/Articles/types'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

type ResponseData = { article: LocalArticleDocument | null } | { error: string }

export const config = {
	api: {
		bodyParser: {
			sizeLimit: '5mb'
		}
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	if (req.method !== 'GET' && req.method !== 'POST') {
		res.setHeader('Allow', ['GET', 'POST'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		if (req.method === 'GET') {
			const article = await readLocalArticleDocument()
			return res.status(200).json({ article })
		}

		const existing = await readLocalArticleDocument()
		const normalized = normalizeLocalArticleDocument(req.body, existing)
		if (normalized.ok === false) {
			return res.status(400).json({ error: normalized.error })
		}

		await writeLocalArticleDocument(normalized.value)
		return res.status(200).json({ article: normalized.value })
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Failed to read or write local article' })
	}
}

export default withApiRouteTelemetry('/api/articles/local', handler)
