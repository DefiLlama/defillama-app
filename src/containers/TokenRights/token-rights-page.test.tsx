import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

function setupPageModule({
	tokensJson = {},
	tokenRightsEntries = [],
	protocolMetadata = {}
}: {
	tokensJson?: Record<string, { name: string; symbol: string; protocolId?: string; chainId?: string; route?: string }>
	tokenRightsEntries?: unknown[]
	protocolMetadata?: Record<string, unknown>
} = {}) {
	vi.doMock('fs', () => ({
		promises: {
			readFile: vi.fn().mockResolvedValue(JSON.stringify(tokensJson))
		}
	}))
	vi.doMock('next/link', () => ({
		default: () => null
	}))
	vi.doMock('~/components/TokenLogo', () => ({
		TokenLogo: () => null
	}))
	vi.doMock('~/containers/TokenRights/api', () => ({
		fetchTokenRightsData: vi.fn().mockResolvedValue(tokenRightsEntries)
	}))
	vi.doMock('~/layout', () => ({
		default: () => null
	}))
	vi.doMock('~/utils', () => ({
		slug: (value: string) =>
			value
				.toLowerCase()
				.replaceAll(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
	}))
	vi.doMock('~/utils/icons', () => ({
		tokenIconUrl: (value: string) => `icon:${value}`
	}))
	vi.doMock('~/utils/maxAgeForNext', () => ({
		maxAgeForNext: () => 123
	}))
	vi.doMock('~/utils/perf', () => ({
		withPerformanceLogging: (_label: string, fn: any) => fn
	}))
	vi.doMock('~/utils/metadata', () => ({
		__esModule: true,
		default: {
			protocolMetadata
		}
	}))

	return import('~/pages/token-rights')
}

describe('token rights page', () => {
	it('routes token rights entries to token pages when tokens.json matches protocolId or chainId', async () => {
		const page = await setupPageModule({
			tokensJson: {
				ldo: { name: 'Lido DAO', symbol: 'LDO', protocolId: '182', route: '/token/LDO' },
				eth: { name: 'Ethereum', symbol: 'ETH', chainId: 'ethereum', route: '/token/ETH' }
			},
			tokenRightsEntries: [
				{ 'Protocol Name': 'Ethereum', 'DefiLlama ID': 'ethereum' },
				{ 'Protocol Name': 'Lido DAO', 'DefiLlama ID': '182' },
				{ 'Protocol Name': 'Unknown Protocol', 'DefiLlama ID': '999' }
			],
			protocolMetadata: {
				'182': { displayName: 'Lido' }
			}
		})

		await expect(page.getStaticProps()).resolves.toEqual({
			props: {
				protocols: [
					{ name: 'Ethereum', logo: 'icon:Ethereum', href: '/token/ETH' },
					{ name: 'Lido', logo: 'icon:Lido', href: '/token/LDO' },
					{
						name: 'Unknown Protocol',
						logo: 'icon:Unknown Protocol',
						href: '/protocol/token-rights/unknown-protocol'
					}
				]
			},
			revalidate: 123
		})
	})

	it('skips entries without a DefiLlama id', async () => {
		const page = await setupPageModule({
			tokenRightsEntries: [{ 'Protocol Name': 'Missing ID', 'DefiLlama ID': '' }]
		})

		await expect(page.getStaticProps()).resolves.toEqual({
			props: {
				protocols: []
			},
			revalidate: 123
		})
	})
})
