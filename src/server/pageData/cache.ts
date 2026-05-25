import type { NextApiRequest, NextApiResponse } from 'next'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'

export const PAGE_DATA_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export function setPageDataCacheHeaders(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader('Cache-Control', jitterCacheControlHeader(PAGE_DATA_CACHE_CONTROL, req.url ?? 'page-data'))
}
