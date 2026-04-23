import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { writeDatasetManifest, writeJsonFile } from './core'
import { getTokenYieldsRowsFromCache } from './yields'

describe('dataset cache yields reader', () => {
	let tempDir = ''
	let previousCacheDir: string | undefined

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-yields-'))
		previousCacheDir = process.env.DATASET_CACHE_DIR
		process.env.DATASET_CACHE_DIR = tempDir
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
		if (previousCacheDir === undefined) {
			delete process.env.DATASET_CACHE_DIR
		} else {
			process.env.DATASET_CACHE_DIR = previousCacheDir
		}

		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true })
		}
	})

	it('reads token yields by filtering cached rows', async () => {
		const rows: IYieldTableRow[] = [
			{
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
			},
			{
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
		]

		await writeJsonFile(path.join(tempDir, 'yields', 'rows.json'), rows)
		await writeJsonFile(path.join(tempDir, 'yields', 'config.json'), { protocols: {} })
		await writeJsonFile(path.join(tempDir, 'yields', 'lend-borrow.json'), { props: { pools: [] } })

		const result = await getTokenYieldsRowsFromCache('BTC')

		expect(result).toEqual([rows[0]])
	})
})
