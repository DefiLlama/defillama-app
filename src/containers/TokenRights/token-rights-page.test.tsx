import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TokenDirectory } from '~/utils/tokenDirectory'

const originalTokenRightsAlertWebhook = process.env.TOKEN_RIGHTS_ALERT_WEBHOOK

afterEach(() => {
	if (originalTokenRightsAlertWebhook === undefined) {
		delete process.env.TOKEN_RIGHTS_ALERT_WEBHOOK
	} else {
		process.env.TOKEN_RIGHTS_ALERT_WEBHOOK = originalTokenRightsAlertWebhook
	}
	vi.clearAllMocks()
	vi.resetModules()
})

function setupPageModule({
	chainMetadata = {},
	tokensJson = {},
	tokenRightsEntries = [],
	protocolMetadata = {}
}: {
	chainMetadata?: Record<string, unknown>
	tokensJson?: TokenDirectory
	tokenRightsEntries?: unknown[]
	protocolMetadata?: Record<string, unknown>
} = {}) {
	delete process.env.TOKEN_RIGHTS_ALERT_WEBHOOK

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
	vi.doMock('~/utils/async', () => ({
		formatRuntimeLog: vi.fn(({ event, level, status, message }) =>
			[event, level, status, message].filter(Boolean).join(' ')
		),
		postRuntimeLogs: vi.fn()
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
			chainMetadata,
			protocolMetadata,
			tokenDirectory: tokensJson
		},
		refreshMetadataIfStale: vi.fn().mockResolvedValue(undefined)
	}))

	return import('~/pages/token-rights')
}

describe('token rights page', () => {
	it('routes token rights entries to token pages when metadata gecko ids match token directory records', async () => {
		const page = await setupPageModule({
			chainMetadata: {
				ethereum: { name: 'Ethereum', id: 'ethereum', gecko_id: 'ethereum' }
			},
			tokensJson: {
				ldo: { name: 'Lido DAO', symbol: 'LDO', token_nk: 'coingecko:lido-dao', route: '/token/LDO' },
				eth: { name: 'Ethereum', symbol: 'ETH', token_nk: 'coingecko:ethereum', route: '/token/ETH' }
			},
			tokenRightsEntries: [
				{ 'Protocol Name': 'Ethereum', 'DefiLlama ID': 'ethereum' },
				{ 'Protocol Name': 'Lido DAO', 'DefiLlama ID': '182' }
			],
			protocolMetadata: {
				'182': { displayName: 'Lido', gecko_id: 'lido-dao' }
			}
		})

		await expect(page.getStaticProps({} as never)).resolves.toEqual({
			props: {
				protocols: [
					{ name: 'Ethereum', logo: 'icon:Ethereum', href: '/token/ETH' },
					{ name: 'Lido', logo: 'icon:Lido', href: '/token/LDO' }
				]
			},
			revalidate: 123
		})
		const { postRuntimeLogs } = await import('~/utils/async')
		expect(postRuntimeLogs).not.toHaveBeenCalled()
	})

	it('skips entries without token directory routes', async () => {
		const page = await setupPageModule({
			chainMetadata: {
				ethereum: { name: 'Ethereum', id: 'ethereum', gecko_id: 'ethereum' }
			},
			tokenRightsEntries: [
				{ 'Protocol Name': 'Missing ID', 'DefiLlama ID': '' },
				{ 'Protocol Name': 'Unknown Protocol', 'DefiLlama ID': '999' },
				{ 'Protocol Name': 'Ethereum', 'DefiLlama ID': 'ethereum' }
			]
		})

		await expect(page.getStaticProps({} as never)).resolves.toEqual({
			props: {
				protocols: []
			},
			revalidate: 123
		})
		const { postRuntimeLogs } = await import('~/utils/async')
		expect(postRuntimeLogs).toHaveBeenCalledTimes(1)
	})
})
