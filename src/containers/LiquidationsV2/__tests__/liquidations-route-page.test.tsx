import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/constants', async (importOriginal) => ({
	...(await importOriginal<typeof import('~/constants')>()),
	SKIP_BUILD_STATIC_GENERATION: false
}))

vi.mock('~/layout', () => ({
	default: () => null
}))

vi.mock('~/containers/LiquidationsV2/RouteContent', () => ({
	LiquidationsOverviewRouteContent: () => null,
	LiquidationsProtocolRouteContent: () => null,
	LiquidationsChainRouteContent: () => null
}))

vi.mock('~/containers/LiquidationsV2/server/dataset', () => ({
	getLiquidationsProtocolsList: vi.fn(),
	getLiquidationsProtocolChainIds: vi.fn()
}))

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: {
		chainMetadata: {
			'arbitrum-one': { id: 'arbitrum', name: 'Arbitrum One' }
		},
		protocolMetadata: {
			makerdao: { name: 'sky', displayName: 'Sky' }
		}
	},
	refreshMetadataIfStale: vi.fn().mockResolvedValue(undefined)
}))

import {
	getLiquidationsProtocolChainIds,
	getLiquidationsProtocolsList
} from '~/containers/LiquidationsV2/server/dataset'
import * as chainPage from '~/pages/liquidations/[protocol]/[chain]'
import * as protocolPage from '~/pages/liquidations/[protocol]/index'
import * as overviewPage from '~/pages/liquidations/index'

const mockedGetLiquidationsProtocolsList = getLiquidationsProtocolsList as unknown as ReturnType<typeof vi.fn>
const mockedGetLiquidationsProtocolChainIds = getLiquidationsProtocolChainIds as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
	vi.clearAllMocks()
	mockedGetLiquidationsProtocolsList.mockResolvedValue({
		protocols: ['sky']
	})
	mockedGetLiquidationsProtocolChainIds.mockResolvedValue(['Arbitrum One'])
})

describe('liquidations SSG routes', () => {
	it('returns minimal shell props for the overview page', async () => {
		await expect(overviewPage.getStaticProps({} as never)).resolves.toEqual(
			expect.objectContaining({
				props: expect.objectContaining({
					protocolLinks: [
						{ label: 'Overview', to: '/liquidations' },
						{ label: 'Sky', to: '/liquidations/sky' }
					]
				})
			})
		)
	})

	it('returns minimal shell props for the protocol page', async () => {
		await expect(protocolPage.getStaticProps({ params: { protocol: 'sky' } } as never)).resolves.toEqual(
			expect.objectContaining({
				props: {
					protocolName: 'Sky',
					protocolSlug: 'sky',
					protocolLinks: [
						{ label: 'Overview', to: '/liquidations' },
						{ label: 'Sky', to: '/liquidations/sky' }
					],
					chainLinks: [{ label: 'All Chains', to: '/liquidations/sky' }]
				}
			})
		)
	})

	it('returns notFound for an invalid protocol slug', async () => {
		await expect(protocolPage.getStaticProps({ params: { protocol: 'bad' } } as never)).resolves.toEqual({
			notFound: true
		})
	})

	it('returns all protocol paths and enables blocking fallback', async () => {
		await expect(protocolPage.getStaticPaths()).resolves.toEqual({
			paths: [{ params: { protocol: 'sky' } }],
			fallback: 'blocking'
		})
	})

	it('returns minimal shell props for the chain page', async () => {
		await expect(
			chainPage.getStaticProps({ params: { protocol: 'sky', chain: 'arbitrum-one' } } as never)
		).resolves.toEqual(
			expect.objectContaining({
				props: {
					protocolName: 'Sky',
					protocolSlug: 'sky',
					chainName: 'Arbitrum One',
					chainSlug: 'arbitrum-one',
					protocolLinks: [
						{ label: 'Overview', to: '/liquidations' },
						{ label: 'Sky', to: '/liquidations/sky' }
					],
					chainLinks: [
						{ label: 'All Chains', to: '/liquidations/sky' },
						{ label: 'Arbitrum One', to: '/liquidations/sky/arbitrum-one' }
					]
				}
			})
		)
	})

	it('returns notFound for an invalid chain slug', async () => {
		await expect(
			chainPage.getStaticProps({ params: { protocol: 'sky', chain: 'bad-chain' } } as never)
		).resolves.toEqual({
			notFound: true
		})
	})
})
