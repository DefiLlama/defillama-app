import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchRWAActiveTVLsMock = vi.fn()
const getRWAAssetsOverviewMock = vi.fn()

vi.mock('~/containers/RWA/api', () => ({
	fetchRWAActiveTVLs: (...args: unknown[]) => fetchRWAActiveTVLsMock(...args)
}))

vi.mock('~/containers/RWA/queries', () => ({
	getRWAAssetsOverview: (...args: unknown[]) => getRWAAssetsOverviewMock(...args)
}))

vi.mock('~/utils/metadata', () => ({
	default: {
		rwaList: { chains: [], categories: [], platforms: [], assetGroups: [], canonicalMarketIds: [], idMap: {} }
	}
}))

import { getStaticProps } from '~/pages/rwa/issuer/[issuer]'

describe('/rwa/issuer/[issuer]', () => {
	beforeEach(() => {
		fetchRWAActiveTVLsMock.mockReset()
		getRWAAssetsOverviewMock.mockReset()
	})

	it('returns notFound when issuer slug does not match dataset', async () => {
		fetchRWAActiveTVLsMock.mockResolvedValue([{ id: 'a', issuer: 'IssuerA' }])
		const res = await getStaticProps({ params: { issuer: 'nope' } } as never)
		expect(res).toEqual({ notFound: true })
	})

	it('loads issuer overview when issuer slug matches', async () => {
		const rows = [{ id: 'a', issuer: 'Issuer A' }]
		fetchRWAActiveTVLsMock.mockResolvedValue(rows)
		getRWAAssetsOverviewMock.mockResolvedValue({ assets: [] })
		const res = await getStaticProps({ params: { issuer: 'issuer-a' } } as never)
		expect(res).toHaveProperty('props.issuerName', 'Issuer A')
		expect(getRWAAssetsOverviewMock).toHaveBeenCalledWith(
			expect.objectContaining({ issuer: 'issuer-a', prefetchedRwaProjects: rows })
		)
	})
})
