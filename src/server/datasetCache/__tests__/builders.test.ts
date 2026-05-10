import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
})
