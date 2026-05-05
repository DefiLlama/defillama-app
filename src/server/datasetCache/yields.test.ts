import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { DATASET_DOMAINS, type DatasetManifest, writeDatasetManifest, writeJsonFile } from './core'
import { getTokenYieldsRowsFromCache } from './yields'

function createDatasetManifestDomains(): DatasetManifest['domains'] {
	const domains = {} as DatasetManifest['domains']
	for (const domain of DATASET_DOMAINS) {
		domains[domain] = { builtAt: Date.now() }
	}
	return domains
}

describe('dataset cache yields reader', () => {
	let tempDir = ''

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
