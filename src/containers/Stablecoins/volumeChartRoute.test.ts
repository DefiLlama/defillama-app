import type { NextApiRequest, NextApiResponse } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchGlobalMock, fetchChainMock, fetchTokenMock } = vi.hoisted(() => ({
	fetchGlobalMock: vi.fn(),
	fetchChainMock: vi.fn(),
	fetchTokenMock: vi.fn()
}))

vi.mock('~/containers/Stablecoins/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/containers/Stablecoins/api')>()
	return {
		...actual,
		fetchStablecoinVolumeChartApi: fetchGlobalMock,
		fetchStablecoinChainVolumeChartApi: fetchChainMock,
		fetchStablecoinTokenVolumeChartApi: fetchTokenMock
	}
})

import handler from '~/pages/api/stablecoins/volume-chart'

const volumeData = [
	[1609459200, 100],
	[1609545600, 125]
]

function createRes() {
	const res: Partial<NextApiResponse> = {
		setHeader: vi.fn(),
		status: vi.fn(),
		json: vi.fn()
	}

	;(res.status as ReturnType<typeof vi.fn>).mockImplementation(() => res as NextApiResponse)
	;(res.json as ReturnType<typeof vi.fn>).mockImplementation(() => res as NextApiResponse)

	return res as NextApiResponse
}

beforeEach(() => {
	vi.clearAllMocks()
	fetchGlobalMock.mockResolvedValue(volumeData)
	fetchChainMock.mockResolvedValue(volumeData)
	fetchTokenMock.mockResolvedValue(volumeData)
})

describe('/api/stablecoins/volume-chart', () => {
	it('rejects non-GET requests', async () => {
		const req = { method: 'POST', query: {} } as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(res.status).toHaveBeenCalledWith(405)
		expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
	})

	it('uses global volume fetchers', async () => {
		const req = { method: 'GET', query: { scope: 'global', chart: 'token' } } as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(fetchGlobalMock).toHaveBeenCalledWith('token')
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ valueSymbol: '$' }))
	})

	it('uses normalized chain volume fetchers', async () => {
		const req = {
			method: 'GET',
			query: { scope: 'chain', chain: 'zkSync Era', chart: 'currency' }
		} as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(fetchChainMock).toHaveBeenCalledWith('era', 'currency')
		expect(res.status).toHaveBeenCalledWith(200)
	})

	it('uses token scoped volume fetchers', async () => {
		const req = { method: 'GET', query: { scope: 'token', token: 'USDT', chart: 'chain' } } as unknown as NextApiRequest
		const res = createRes()

		await handler(req, res)

		expect(fetchTokenMock).toHaveBeenCalledWith('USDT', 'chain')
		expect(res.status).toHaveBeenCalledWith(200)
	})

	it('rejects unsupported scope and chart combinations', async () => {
		const res = createRes()
		await handler(
			{
				method: 'GET',
				query: { scope: 'chain', chain: 'Ethereum', chart: 'chain' }
			} as unknown as NextApiRequest,
			res
		)

		expect(fetchChainMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith({ error: 'unsupported chain volume chart' })
	})
})
