import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServerSideProps, getYieldPoolAssetTokens } from '~/pages/yields/pool/[pool]'
import { ProtocolInformationCard } from '../ProtocolInformationCard'

const { getYieldPoolPageDataMock } = vi.hoisted(() => ({
	getYieldPoolPageDataMock: vi.fn()
}))

vi.mock('~/containers/Yields/server/dataset', () => ({
	getYieldPoolPageData: getYieldPoolPageDataMock
}))

describe('YieldPoolPage', () => {
	beforeEach(() => {
		getYieldPoolPageDataMock.mockReset()
	})

	it('renders an internal protocol link in the protocol information card', () => {
		const html = renderToStaticMarkup(
			<ProtocolInformationCard category="Dexs" projectName="Aerodrome" projectSlug="aerodrome" config={{}} url="" />
		)

		expect(html).toContain('href="/protocol/aerodrome"')
		expect(html).toContain('Aerodrome')
	})

	it('renders internal token links for pool assets in the information card', () => {
		const assetTokens = getYieldPoolAssetTokens('cbETH-cbBTC')
		const html = renderToStaticMarkup(
			<ProtocolInformationCard
				category="Dexs"
				projectName="Aerodrome"
				projectSlug="aerodrome"
				config={{}}
				url=""
				assetTokens={assetTokens}
			/>
		)

		expect(html).toContain('href="/token/cbeth"')
		expect(html).toContain('href="/token/cbbtc"')
		expect(assetTokens).toEqual(['cbeth', 'cbbtc'])
	})

	it('returns not found for malformed pool ids before fetching data', async () => {
		const res = { setHeader: vi.fn() }

		const result = await getServerSideProps({
			req: { method: 'GET' },
			resolvedUrl: '/yields/pool/79e042b5-e55d-4a4e-b0b0-6661a570470b%252525253Cgrok%3Arender',
			params: {
				pool: '79e042b5-e55d-4a4e-b0b0-6661a570470b%252525253Cgrok%3Arender'
			},
			res
		} as any)

		expect(result).toEqual({ notFound: true })
		expect(res.setHeader).not.toHaveBeenCalled()
		expect(getYieldPoolPageDataMock).not.toHaveBeenCalled()
	})

	it('returns not found for valid missing pool ids after checking data', async () => {
		const poolId = '79e042b5-e55d-4a4e-b0b0-6661a570470b'
		const res = { setHeader: vi.fn() }
		getYieldPoolPageDataMock.mockResolvedValue({ source: 'cache', data: null })

		const result = await getServerSideProps({
			req: { method: 'GET' },
			resolvedUrl: `/yields/pool/${poolId}`,
			params: { pool: poolId },
			res
		} as any)

		expect(result).toEqual({ notFound: true })
		expect(getYieldPoolPageDataMock).toHaveBeenCalledWith(poolId)
		expect(res.setHeader).not.toHaveBeenCalled()
	})
})
