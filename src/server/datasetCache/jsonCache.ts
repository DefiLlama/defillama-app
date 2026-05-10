import { promises as fs } from 'node:fs'
import path from 'node:path'
import { readJsonFileOnce, writeJsonFileAtomically } from './jsonIo'

type JsonCacheEntry = {
	stat: {
		mtimeMs: number
		size: number
		ino: number
	}
	value: unknown
}

const jsonCache = new Map<string, JsonCacheEntry>()
const jsonCacheRefreshInFlight = new Map<string, Promise<void>>()
const jsonCacheVersions = new Map<string, number>()

function getJsonCacheVersion(filePath: string): number {
	return jsonCacheVersions.get(filePath) ?? 0
}

function bumpJsonCacheVersion(filePath: string): void {
	jsonCacheVersions.set(filePath, getJsonCacheVersion(filePath) + 1)
}

async function readAndCacheJsonFile<T>(filePath: string): Promise<T> {
	const cacheVersion = getJsonCacheVersion(filePath)
	const stat = await fs.stat(filePath)
	const cached = jsonCache.get(filePath)
	if (
		cached &&
		cached.stat.mtimeMs === stat.mtimeMs &&
		cached.stat.size === stat.size &&
		cached.stat.ino === stat.ino
	) {
		return cached.value as T
	}

	const parsed = await readJsonFileOnce<T>(filePath)
	if (getJsonCacheVersion(filePath) === cacheVersion) {
		jsonCache.set(filePath, {
			stat: {
				mtimeMs: stat.mtimeMs,
				size: stat.size,
				ino: stat.ino
			},
			value: parsed
		})
	}

	return parsed
}

function refreshJsonFileInBackground(filePath: string): void {
	if (jsonCacheRefreshInFlight.has(filePath)) {
		return
	}

	const refresh = readAndCacheJsonFile(filePath)
		.catch((error) => {
			console.warn(`[datasetCache] failed to refresh ${path.basename(filePath)}:`, error)
		})
		.then(() => undefined)
		.finally(() => {
			jsonCacheRefreshInFlight.delete(filePath)
		})

	jsonCacheRefreshInFlight.set(filePath, refresh)
}

export async function readDatasetCacheJson<T>(filePath: string): Promise<T> {
	const cached = jsonCache.get(filePath)
	if (cached) {
		refreshJsonFileInBackground(filePath)
		return cached.value as T
	}

	return readAndCacheJsonFile<T>(filePath)
}

export async function writeDatasetCacheJson(filePath: string, value: unknown): Promise<void> {
	await writeJsonFileAtomically(filePath, value)
	bumpJsonCacheVersion(filePath)
	jsonCache.delete(filePath)
}
