import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureDirectory, pathExists, removeDirectory, replaceDirectoryWithBackup } from '~/utils/cacheDirectory'
import {
	METADATA_ARTIFACT_KEYS,
	METADATA_ARTIFACT_REGISTRY,
	METADATA_CI_STUBS,
	getMetadataArtifactEntries,
	parseMetadataArtifact,
	validateCoreMetadataPayload,
	type CoreMetadataPayload,
	type MetadataArtifactKey
} from './artifactContract'
import {
	METADATA_MANIFEST_FILE,
	createMetadataArtifactManifest,
	parseMetadataArtifactManifest,
	type MetadataArtifactManifest,
	type MetadataArtifactStatus
} from './manifest'

export { getMetadataCacheDir } from './config'

export function getMetadataManifestPath(cacheDir: string): string {
	return path.join(cacheDir, METADATA_MANIFEST_FILE)
}

export async function readMetadataArtifactManifest(cacheDir: string): Promise<MetadataArtifactManifest | null> {
	try {
		const contents = await fs.readFile(getMetadataManifestPath(cacheDir), 'utf8')
		return parseMetadataArtifactManifest(JSON.parse(contents))
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null
		}
		throw error
	}
}

export async function readValidMetadataArtifactManifest(cacheDir: string): Promise<MetadataArtifactManifest | null> {
	try {
		return await readMetadataArtifactManifest(cacheDir)
	} catch {
		return null
	}
}

export async function getMissingMetadataArtifacts(
	cacheDir: string,
	_manifest: MetadataArtifactManifest
): Promise<string[]> {
	const missingArtifacts: string[] = []

	for (const key of METADATA_ARTIFACT_KEYS) {
		const artifact = METADATA_ARTIFACT_REGISTRY[key]
		if (!(await pathExists(path.join(cacheDir, artifact.file)))) {
			missingArtifacts.push(artifact.file)
		}
	}

	return missingArtifacts
}

export async function hasMetadataArtifactFiles(cacheDir: string, manifest: MetadataArtifactManifest): Promise<boolean> {
	try {
		await validateMetadataArtifactSet(cacheDir, manifest)
		return true
	} catch {
		return false
	}
}

export async function validateMetadataArtifactSet(cacheDir: string, manifest: MetadataArtifactManifest): Promise<void> {
	parseMetadataArtifactManifest(manifest)
	for (const key of METADATA_ARTIFACT_KEYS) {
		await readMetadataArtifact(cacheDir, key)
	}
}

async function readMetadataArtifact<Key extends MetadataArtifactKey>(
	cacheDir: string,
	key: Key
): Promise<CoreMetadataPayload[Key]> {
	const artifact = METADATA_ARTIFACT_REGISTRY[key]
	const contents = await fs.readFile(path.join(cacheDir, artifact.file), 'utf8')
	return parseMetadataArtifact(key, JSON.parse(contents))
}

async function writeMetadataArtifactsToDir(
	cacheDir: string,
	payload: CoreMetadataPayload,
	status: MetadataArtifactStatus,
	pulledAt: number
): Promise<void> {
	await ensureDirectory(cacheDir)
	for (const [file, data] of getMetadataArtifactEntries(payload)) {
		await fs.writeFile(path.join(cacheDir, file), JSON.stringify(data))
	}
	await fs.writeFile(
		getMetadataManifestPath(cacheDir),
		JSON.stringify(createMetadataArtifactManifest(status, pulledAt), null, 2)
	)
}

export async function writeMetadataArtifacts(
	cacheDir: string,
	payload: CoreMetadataPayload,
	status: MetadataArtifactStatus = 'ready',
	pulledAt = Date.now()
): Promise<void> {
	const validatedPayload = validateCoreMetadataPayload(payload)
	const parentDir = path.dirname(cacheDir)
	const tempDir = path.join(parentDir, `${path.basename(cacheDir)}.tmp`)
	const backupDir = path.join(parentDir, `${path.basename(cacheDir)}.bak`)

	await ensureDirectory(parentDir)
	await removeDirectory(tempDir)

	try {
		await writeMetadataArtifactsToDir(tempDir, validatedPayload, status, pulledAt)
		const manifest = await readMetadataArtifactManifest(tempDir)
		if (!manifest) {
			throw new Error('Metadata artifact manifest was not written')
		}
		await validateMetadataArtifactSet(tempDir, manifest)
		await replaceDirectoryWithBackup({
			targetDir: cacheDir,
			nextDir: tempDir,
			backupDir
		})
	} catch (error) {
		await removeDirectory(tempDir)
		throw error
	}
}

export async function writeMissingMetadataStubArtifacts(cacheDir: string, pulledAt = Date.now()): Promise<void> {
	const payload = { ...METADATA_CI_STUBS }
	const writablePayload = payload as Record<MetadataArtifactKey, unknown>

	for (const key of METADATA_ARTIFACT_KEYS) {
		try {
			writablePayload[key] = await readMetadataArtifact(cacheDir, key)
		} catch {
			writablePayload[key] = METADATA_ARTIFACT_REGISTRY[key].stub
		}
	}

	await writeMetadataArtifacts(cacheDir, payload, 'stub', pulledAt)
}
