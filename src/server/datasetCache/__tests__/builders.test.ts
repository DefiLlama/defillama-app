import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'

const {
	buildYieldTableRowsWithBorrowDataMock,
	fetchYieldConfigFromNetworkMock,
	getLendBorrowDataFromYieldPageDataMock,
	getYieldPageDataFromNetworkMock
} = vi.hoisted(() => ({
	buildYieldTableRowsWithBorrowDataMock: vi.fn(),
	fetchYieldConfigFromNetworkMock: vi.fn(),
	getLendBorrowDataFromYieldPageDataMock: vi.fn(),
	getYieldPageDataFromNetworkMock: vi.fn()
}))

vi.mock('~/containers/Yields/poolsPipeline', () => ({
	buildYieldTableRowsWithBorrowData: buildYieldTableRowsWithBorrowDataMock
}))

vi.mock('~/containers/Yields/queries/index', () => ({
	fetchYieldConfigFromNetwork: fetchYieldConfigFromNetworkMock,
	getLendBorrowDataFromYieldPageData: getLendBorrowDataFromYieldPageDataMock,
	getYieldPageDataFromNetwork: getYieldPageDataFromNetworkMock
}))

describe('dataset cache builders', () => {
	let tempDir = ''

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-builders-'))
		vi.stubEnv('DATASET_CACHE_DIR', tempDir)
		vi.stubEnv('DATASET_CACHE_FETCH_TIMEOUT_MS', '222000')
		buildYieldTableRowsWithBorrowDataMock.mockReset()
		fetchYieldConfigFromNetworkMock.mockReset()
		getLendBorrowDataFromYieldPageDataMock.mockReset()
		getYieldPageDataFromNetworkMock.mockReset()

		const yieldPageData = { props: { pools: [] } }
		getYieldPageDataFromNetworkMock.mockResolvedValue(yieldPageData)
		getLendBorrowDataFromYieldPageDataMock.mockResolvedValue({ props: { pools: [] } })
		fetchYieldConfigFromNetworkMock.mockResolvedValue({ protocols: {} })
		buildYieldTableRowsWithBorrowDataMock.mockReturnValue([])
	})

	afterEach(async () => {
		vi.unstubAllEnvs()
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true })
			tempDir = ''
		}
	})

	it('uses the dataset-cache timeout for slow yield domain fetches', async () => {
		const { buildDatasetDomain } = await import('../builders')

		await buildDatasetDomain('yields', tempDir)

		expect(getYieldPageDataFromNetworkMock).toHaveBeenCalledWith({ timeout: 222_000 })
		expect(getLendBorrowDataFromYieldPageDataMock).toHaveBeenCalledWith(
			await getYieldPageDataFromNetworkMock.mock.results[0].value,
			{ timeout: 222_000 }
		)
		expect(fetchYieldConfigFromNetworkMock).toHaveBeenCalledWith({ timeout: 222_000 })
	}, 15_000)

	it('builds a readable yields artifact round trip', async () => {
		const btcRow: IYieldTableRow = {
			pool: 'WBTC-ETH',
			projectslug: 'maker',
			project: 'Maker',
			chains: ['Ethereum'],
			tvl: 100,
			apy: 1,
			apyBase: 1,
			apyReward: 0,
			rewardTokensSymbols: [],
			rewards: [],
			change1d: null,
			change7d: null,
			confidence: null,
			url: 'https://example.com',
			category: 'Lending',
			configID: 'pool-1'
		}
		const ethRow: IYieldTableRow = {
			...btcRow,
			pool: 'USDC-ETH',
			tvl: 200,
			apy: 2,
			url: 'https://example.com/2',
			configID: 'pool-2'
		}
		const yieldConfig = { protocols: { maker: { name: 'Maker' } } }
		getLendBorrowDataFromYieldPageDataMock.mockResolvedValue({ props: { pools: [] } })
		fetchYieldConfigFromNetworkMock.mockResolvedValue(yieldConfig)
		buildYieldTableRowsWithBorrowDataMock.mockReturnValue([btcRow, ethRow])

		const { buildDatasetDomain } = await import('../builders')
		const {
			getProtocolYieldRowsFromCache,
			getTokenBorrowRoutesFromCache,
			getTokenYieldsRowsFromCache,
			getYieldConfigFromCache,
			getYieldPoolRowFromCache
		} = await import('../yields')
		const { buildEmptyDatasetManifest, writeDatasetManifest } = await import('../core')

		await buildDatasetDomain('yields', tempDir)
		await writeDatasetManifest(buildEmptyDatasetManifest(), tempDir)

		await expect(getTokenYieldsRowsFromCache('BTC')).resolves.toEqual([btcRow])
		await expect(getYieldPoolRowFromCache('pool-2')).resolves.toEqual(ethRow)
		await expect(getYieldConfigFromCache()).resolves.toEqual(yieldConfig)
		await expect(getTokenBorrowRoutesFromCache('BTC')).resolves.toEqual({
			borrowAsCollateral: [],
			borrowAsDebt: []
		})
		await expect(getProtocolYieldRowsFromCache(['maker'])).resolves.toEqual([btcRow, ethRow])
	}, 15_000)
})
