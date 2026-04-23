import { promises as fs } from 'node:fs'
import path from 'node:path'

export const DATASET_CACHE_ARTIFACT_VERSION = 1

export const DATASET_DOMAINS = [
	'yields',
	'token-rights',
	'risk',
	'raises',
	'treasuries',
	'liquidity',
	'liquidations'
] as const

export type DatasetDomain = (typeof DATASET_DOMAINS)[number]

export type DatasetManifest = {
	artifactVersion: number
	builtAt: number
	domains: Record<DatasetDomain, { builtAt: number }>
}

type JsonCacheEntry = {
	mtimeMs: number
	value: unknown
}

const jsonCache = new Map<string, JsonCacheEntry>()

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
	const stat = await fs.stat(filePath)
	const cached = jsonCache.get(filePath)
	if (cached && cached.mtimeMs === stat.mtimeMs) {
		return cached.value as T
	}

	const fileContent = await fs.readFile(filePath, 'utf8')
	const parsed = JSON.parse(fileContent) as T
	jsonCache.set(filePath, {
		mtimeMs: stat.mtimeMs,
		value: parsed
	})

	return parsed
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
	await ensureDirectory(path.dirname(filePath))
	await fs.writeFile(filePath, JSON.stringify(value))
	jsonCache.delete(filePath)
}

export async function readDatasetManifest(): Promise<DatasetManifest> {
	return readDatasetManifestFrom(getDatasetCacheRootDir())
}

export async function readDatasetManifestFrom(rootDir: string): Promise<DatasetManifest> {
	const manifest = await readJsonFile<DatasetManifest>(path.join(rootDir, 'manifest.json'))
	if (manifest.artifactVersion !== DATASET_CACHE_ARTIFACT_VERSION) {
		throw new Error(
			`Dataset cache artifact version mismatch: expected ${DATASET_CACHE_ARTIFACT_VERSION}, got ${manifest.artifactVersion}`
		)
	}

	for (const domain of DATASET_DOMAINS) {
		if (!manifest.domains?.[domain]?.builtAt) {
			throw new Error(`Dataset cache manifest is missing builtAt for ${domain}`)
		}
	}

	return manifest
}

export async function writeDatasetManifest(
	manifest: DatasetManifest,
	rootDir = getDatasetCacheRootDir()
): Promise<void> {
	const manifestPath = path.join(rootDir, 'manifest.json')
	await writeJsonFile(manifestPath, manifest)
}

export async function recoverDirectorySwap(targetDir: string, backupDir: string): Promise<void> {
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

export async function replaceDirectoryAtomic(params: {
	targetDir: string
	nextDir: string
	backupDir: string
}): Promise<void> {
	const { targetDir, nextDir, backupDir } = params

	await recoverDirectorySwap(targetDir, backupDir)
	await removeDirectory(backupDir)

	let movedTargetToBackup = false

	try {
		if (await pathExists(targetDir)) {
			await fs.rename(targetDir, backupDir)
			movedTargetToBackup = true
		}

		await fs.rename(nextDir, targetDir)
		await removeDirectory(backupDir)
	} catch (error) {
		if (movedTargetToBackup && !(await pathExists(targetDir)) && (await pathExists(backupDir))) {
			await fs.rename(backupDir, targetDir)
		}
		throw error
	}
}

export function buildEmptyDatasetManifest(now = Date.now()): DatasetManifest {
	const domains = {} as Record<DatasetDomain, { builtAt: number }>

	for (const domain of DATASET_DOMAINS) {
		domains[domain] = { builtAt: now }
	}

	return {
		artifactVersion: DATASET_CACHE_ARTIFACT_VERSION,
		builtAt: now,
		domains
	}
}
