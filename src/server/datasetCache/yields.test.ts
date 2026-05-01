import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { writeDatasetManifest, writeJsonFile } from './core'
import { getDatasetIndexFileName } from './indexKeys'
import { getTokenYieldsRowsFromCache } from './yields'

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
				domains: {
					yields: { builtAt: Date.now() },
					'token-rights': { builtAt: Date.now() },
					risk: { builtAt: Date.now() },
					raises: { builtAt: Date.now() },
					treasuries: { builtAt: Date.now() },
					liquidity: { builtAt: Date.now() },
					liquidations: { builtAt: Date.now() }
				}
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

		await writeJsonFile(path.join(tempDir, 'yields', 'rows.json'), rows)
		await writeJsonFile(path.join(tempDir, 'yields', 'config.json'), { protocols: {} })
		await writeJsonFile(path.join(tempDir, 'yields', 'lend-borrow.json'), { props: { pools: [] } })

		const result = await getTokenYieldsRowsFromCache('BTC')

		expect(result).toEqual([btcRow])
	})

	it('uses token yield index files when available', async () => {
		await writeJsonFile(path.join(tempDir, 'yields', 'rows.json'), [ethRow])
		await writeJsonFile(path.join(tempDir, 'yields', 'by-token', getDatasetIndexFileName('btc')), [btcRow])

		const result = await getTokenYieldsRowsFromCache('BTC')

		expect(result).toEqual([btcRow])
	})

	it('unions token yield index files for wrapper variants', async () => {
		await writeJsonFile(path.join(tempDir, 'yields', 'rows.json'), [])
		await writeJsonFile(path.join(tempDir, 'yields', 'by-token', getDatasetIndexFileName('btc')), [btcRow])

		const result = await getTokenYieldsRowsFromCache('WBTC')

		expect(result).toEqual([btcRow])
	})

	it('applies chain filters to indexed token yield rows', async () => {
		const arbitrumRow = { ...btcRow, configID: 'pool-3', chains: ['Arbitrum'], apy: 3 }
		await writeJsonFile(path.join(tempDir, 'yields', 'rows.json'), [])
		await writeJsonFile(path.join(tempDir, 'yields', 'by-token', getDatasetIndexFileName('btc')), [arbitrumRow, btcRow])

		const result = await getTokenYieldsRowsFromCache('BTC', 'Ethereum')

		expect(result).toEqual([btcRow])
	})
})
