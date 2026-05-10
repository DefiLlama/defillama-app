import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { DATASET_DOMAINS, type DatasetManifest, writeDatasetManifest, writeJsonFile } from '../core'
import {
	getTokenYieldsRowsFromCache,
	getYieldsConfigPath,
	getYieldsLendBorrowPath,
	getYieldsRowsPath,
	getYieldsTokenIndexPath
} from '../yields'

function createDatasetManifestDomains(): DatasetManifest['domains'] {
	const domains = {} as DatasetManifest['domains']
	for (const domain of DATASET_DOMAINS) {
		domains[domain] = { builtAt: Date.now() }
	}
	return domains
}

describe('dataset cache yields reader', () => {
	let tempDir = ''
	const ethRow: IYieldTableRow = {
		pool: 'USDC-ETH',
		projectslug: 'maker',
		project: 'Maker',
		chains: ['Ethereum'],
		tvl: 200,
		apy: 2,
		apyBase: 2,
		apyReward: 0,
		rewardTokensSymbols: [],
		rewards: [],
		change1d: null,
		change7d: null,
		confidence: null,
		url: 'https://example.com/2',
		category: 'Lending',
		configID: 'pool-2'
	}
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

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-yields-'))
		vi.stubEnv('DATASET_CACHE_DIR', tempDir)
		await writeDatasetManifest(
			{
				artifactVersion: 1,
				builtAt: Date.now(),
				domains: createDatasetManifestDomains()
			},
			tempDir
		)
	})

	afterEach(async () => {
		vi.unstubAllEnvs()
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true })
		}
	})

	it('reads token yields by filtering cached rows', async () => {
		const rows: IYieldTableRow[] = [btcRow, ethRow]

		await writeJsonFile(getYieldsRowsPath(tempDir), rows)
		await writeJsonFile(getYieldsConfigPath(tempDir), { protocols: {} })
		await writeJsonFile(getYieldsLendBorrowPath(tempDir), { props: { pools: [] } })

		const result = await getTokenYieldsRowsFromCache('BTC')

		expect(result).toEqual([btcRow])
	})

	it('uses token yield index files when available', async () => {
		await writeJsonFile(getYieldsRowsPath(tempDir), [ethRow, btcRow])
		await writeJsonFile(getYieldsTokenIndexPath('btc', tempDir), [btcRow.configID])

		const result = await getTokenYieldsRowsFromCache('BTC')

		expect(result).toEqual([btcRow])
	})

	it('unions token yield index files for wrapper variants', async () => {
		await writeJsonFile(getYieldsRowsPath(tempDir), [btcRow])
		await writeJsonFile(getYieldsTokenIndexPath('btc', tempDir), [btcRow.configID])

		const result = await getTokenYieldsRowsFromCache('WBTC')

		expect(result).toEqual([btcRow])
	})

	it('applies chain filters to indexed token yield rows', async () => {
		const arbitrumRow = { ...btcRow, configID: 'pool-3', chains: ['Arbitrum'], apy: 3 }
		await writeJsonFile(getYieldsRowsPath(tempDir), [arbitrumRow, btcRow])
		await writeJsonFile(getYieldsTokenIndexPath('btc', tempDir), [arbitrumRow.configID, btcRow.configID])

		const result = await getTokenYieldsRowsFromCache('BTC', 'Ethereum')

		expect(result).toEqual([btcRow])
	})
})
