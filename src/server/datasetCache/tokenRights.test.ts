import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import { DATASET_DOMAINS, type DatasetManifest, writeDatasetManifest, writeJsonFile } from './core'
import { fetchTokenRightsEntryByNameFromCache, fetchTokenRightsEntryFromCache } from './tokenRights'
import { buildTokenRightsIndexes } from './tokenRightsIndex'

function createDatasetManifestDomains(): DatasetManifest['domains'] {
	const domains = {} as DatasetManifest['domains']
	for (const domain of DATASET_DOMAINS) {
		domains[domain] = { builtAt: Date.now() }
	}
	return domains
}

const makeEntry = (protocolName: string, defillamaId: string): IRawTokenRightsEntry => ({
	'Protocol Name': protocolName,
	Token: [protocolName],
	'Token Type': ['Governance'],
	'Brief description': '',
	'Governance Details (Summary)': '',
	'Governance Decisions': [],
	'Treasury Decisions': [],
	'Revenue Decisions': [],
	'Fee Switch Status': 'OFF',
	Buybacks: [],
	Dividends: [],
	Burns: 'N/A',
	'Associated Entities': [],
	'DefiLlama ID': defillamaId
})

describe('dataset cache token rights reader', () => {
	let tempDir = ''

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-token-rights-'))
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

	it('reads token rights by DefiLlama ID from the index', async () => {
		const indexedEntry = makeEntry('Aave', 'parent#aave')
		const indexes = buildTokenRightsIndexes([indexedEntry])

		await writeJsonFile(path.join(tempDir, 'token-rights', 'full.json'), [])
		await writeJsonFile(path.join(tempDir, 'token-rights', 'by-defillama-id.json'), indexes.byDefillamaId)

		await expect(fetchTokenRightsEntryFromCache('parent#aave')).resolves.toEqual(indexedEntry)
	})

	it('falls back to the full token rights list when the ID index is absent', async () => {
		const entry = makeEntry('Aave', 'parent#aave')

		await writeJsonFile(path.join(tempDir, 'token-rights', 'full.json'), [entry])

		await expect(fetchTokenRightsEntryFromCache('parent#aave')).resolves.toEqual(entry)
	})

	it('reads token rights by protocol name from the index', async () => {
		const indexedEntry = makeEntry('Aave DAO', 'parent#aave')
		const indexes = buildTokenRightsIndexes([indexedEntry])

		await writeJsonFile(path.join(tempDir, 'token-rights', 'full.json'), [])
		await writeJsonFile(path.join(tempDir, 'token-rights', 'by-protocol-name.json'), indexes.byProtocolName)

		await expect(fetchTokenRightsEntryByNameFromCache('Aave DAO')).resolves.toEqual(indexedEntry)
	})

	it('falls back to the full token rights list when the name index is absent', async () => {
		const entry = makeEntry('Aave DAO', 'parent#aave')

		await writeJsonFile(path.join(tempDir, 'token-rights', 'full.json'), [entry])

		await expect(fetchTokenRightsEntryByNameFromCache('Aave DAO')).resolves.toEqual(entry)
	})
})
