import { promises as fs } from 'node:fs'
import path from 'node:path'
import { readDatasetCacheJson, writeDatasetCacheJson } from './jsonCache'
export { readJsonFileOnce, writeJsonFileAtomically } from './jsonIo'

export const DATASET_CACHE_ARTIFACT_VERSION = 2

export const DATASET_DOMAINS = [
	'yields',
	'token-rights',
	'risk',
	'raises',
	'treasuries',
	'liquidity',
	'liquidations',
	'markets'
] as const

export type DatasetDomain = (typeof DATASET_DOMAINS)[number]

export type DatasetDomainManifestEntry =
	| {
			status: 'ready'
			builtAt: number
	  }
	| {
			status: 'failed'
			builtAt: 0
			error: string
	  }

export type DatasetManifest = {
	artifactVersion: typeof DATASET_CACHE_ARTIFACT_VERSION
	builtAt: number
	domains: Record<DatasetDomain, DatasetDomainManifestEntry>
}

type RawDatasetManifest = {
	artifactVersion?: unknown
	builtAt?: unknown
	domains?: Partial<Record<DatasetDomain, unknown>>
}

export class DatasetDomainUnavailableError extends Error {
	constructor(
		public readonly domain: DatasetDomain,
		public readonly reason: string
	) {
		super(`Dataset cache domain "${domain}" is unavailable: ${reason}`)
		this.name = 'DatasetDomainUnavailableError'
	}
}

export function isDatasetDomainUnavailableError(error: unknown): error is DatasetDomainUnavailableError {
	return error instanceof DatasetDomainUnavailableError
}

export function getDatasetCacheRootDir(): string {
	const cacheDir = process.env.DATASET_CACHE_DIR
	if (cacheDir) {
		return path.resolve(process.cwd(), cacheDir)
	}

	return path.resolve(process.cwd(), '.cache/datasets')
}

export function getDatasetDomainDir(domain: DatasetDomain): string {
	return path.join(getDatasetCacheRootDir(), domain)
}

export async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.access(targetPath)
		return true
	} catch {
		return false
	}
}

export async function ensureDirectory(targetPath: string): Promise<void> {
	await fs.mkdir(targetPath, { recursive: true })
}

export async function removeDirectory(targetPath: string): Promise<void> {
	await fs.rm(targetPath, { recursive: true, force: true })
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
	return readDatasetCacheJson<T>(filePath)
}

export async function readDatasetDomainJson<T>(domain: DatasetDomain, relativePath: string): Promise<T> {
	await assertDatasetDomainReady(domain)
	return readJsonFile<T>(path.join(getDatasetDomainDir(domain), relativePath))
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
	await writeDatasetCacheJson(filePath, value)
}

export async function readDatasetManifest(): Promise<DatasetManifest> {
	return readDatasetManifestFrom(getDatasetCacheRootDir())
}

export async function readDatasetManifestFrom(rootDir: string): Promise<DatasetManifest> {
	const manifest = await readJsonFile<RawDatasetManifest>(path.join(rootDir, 'manifest.json'))
	if (manifest.artifactVersion !== DATASET_CACHE_ARTIFACT_VERSION) {
		throw new Error(
			`Dataset cache artifact version mismatch: expected ${DATASET_CACHE_ARTIFACT_VERSION}, got ${manifest.artifactVersion}`
		)
	}
	if (typeof manifest.builtAt !== 'number' || !Number.isFinite(manifest.builtAt) || manifest.builtAt <= 0) {
		throw new Error('Dataset cache manifest has invalid builtAt')
	}

	const domains = {} as Record<DatasetDomain, DatasetDomainManifestEntry>

	for (const domain of DATASET_DOMAINS) {
		const entry = manifest.domains?.[domain]
		if (!entry || typeof entry !== 'object') {
			throw new Error(`Dataset cache manifest is missing ${domain}`)
		}
		const rawEntry = entry as Record<string, unknown>
		if (rawEntry.status === 'ready') {
			if (typeof rawEntry.builtAt !== 'number' || !Number.isFinite(rawEntry.builtAt) || rawEntry.builtAt <= 0) {
				throw new Error(`Dataset cache manifest has invalid builtAt for ${domain}`)
			}
			domains[domain] = { status: 'ready', builtAt: rawEntry.builtAt }
			continue
		}
		if (rawEntry.status === 'failed') {
			if (rawEntry.builtAt !== 0 || typeof rawEntry.error !== 'string' || rawEntry.error.length === 0) {
				throw new Error(`Dataset cache manifest has invalid failure state for ${domain}`)
			}
			domains[domain] = { status: 'failed', builtAt: 0, error: rawEntry.error }
			continue
		}

		throw new Error(`Dataset cache manifest has invalid status for ${domain}`)
	}

	return {
		artifactVersion: DATASET_CACHE_ARTIFACT_VERSION,
		builtAt: manifest.builtAt,
		domains
	}
}

export async function assertDatasetDomainReady(
	domain: DatasetDomain
): Promise<DatasetDomainManifestEntry & { status: 'ready' }> {
	const manifest = await readDatasetManifest()
	const entry = manifest.domains[domain]
	if (entry.status === 'failed') {
		throw new DatasetDomainUnavailableError(domain, entry.error)
	}
	return entry
}

export async function writeDatasetManifest(
	manifest: DatasetManifest,
	rootDir = getDatasetCacheRootDir()
): Promise<void> {
	const manifestPath = path.join(rootDir, 'manifest.json')
	await writeJsonFile(manifestPath, manifest)
}

export async function recoverDirectoryReplacement(targetDir: string, backupDir: string): Promise<void> {
	const targetExists = await pathExists(targetDir)
	if (targetExists) {
		if (await pathExists(backupDir)) {
			await removeDirectory(backupDir)
		}
		return
	}

	if (await pathExists(backupDir)) {
		await fs.rename(backupDir, targetDir)
	}
}

// This uses a backup-and-promote flow. It is recoverable, but not truly atomic
// because readers can observe a brief window where targetDir is absent.
export async function replaceDirectoryWithBackup(params: {
	targetDir: string
	nextDir: string
	backupDir: string
}): Promise<void> {
	const { targetDir, nextDir, backupDir } = params

	await recoverDirectoryReplacement(targetDir, backupDir)
	await removeDirectory(backupDir)

	let movedTargetToBackup = false
	let promotedNextToTarget = false

	try {
		if (await pathExists(targetDir)) {
			await fs.rename(targetDir, backupDir)
			movedTargetToBackup = true
		}

		await fs.rename(nextDir, targetDir)
		promotedNextToTarget = true
		if (await pathExists(backupDir)) {
			await removeDirectory(backupDir)
		}
	} catch (error) {
		if (
			!promotedNextToTarget &&
			movedTargetToBackup &&
			!(await pathExists(targetDir)) &&
			(await pathExists(backupDir))
		) {
			await fs.rename(backupDir, targetDir)
		}
		throw error
	}
}

export function buildEmptyDatasetManifest(now = Date.now()): DatasetManifest {
	const domains = {} as Record<DatasetDomain, DatasetDomainManifestEntry>

	for (const domain of DATASET_DOMAINS) {
		domains[domain] = { status: 'ready', builtAt: now }
	}

	return {
		artifactVersion: DATASET_CACHE_ARTIFACT_VERSION,
		builtAt: now,
		domains
	}
}
