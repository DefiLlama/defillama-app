import fs from 'node:fs/promises'
import path from 'node:path'
import { METADATA_CI_STUBS, getMetadataArtifactEntries, type CoreMetadataPayload } from './artifactContract'
import {
	METADATA_MANIFEST_FILE,
	createMetadataArtifactManifest,
	type MetadataArtifactManifest,
	type MetadataArtifactStatus
} from './manifest'

export function getMetadataCacheDir(repoRoot = process.cwd()): string {
	return path.join(repoRoot, '.cache')
}

export function getMetadataManifestPath(cacheDir: string): string {
	return path.join(cacheDir, METADATA_MANIFEST_FILE)
}

export async function readMetadataArtifactManifest(cacheDir: string): Promise<MetadataArtifactManifest | null> {
	try {
		const contents = await fs.readFile(getMetadataManifestPath(cacheDir), 'utf8')
		return JSON.parse(contents) as MetadataArtifactManifest
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null
		}
		throw error
	}
}

export async function getMissingMetadataArtifacts(
	cacheDir: string,
	manifest: MetadataArtifactManifest
): Promise<string[]> {
	const missingArtifacts: string[] = []

	for (const artifact of manifest.artifacts) {
		if (!(await fileExists(path.join(cacheDir, artifact)))) {
			missingArtifacts.push(artifact)
		}
	}

	return missingArtifacts
}

export async function hasMetadataArtifactFiles(cacheDir: string, manifest: MetadataArtifactManifest): Promise<boolean> {
	return (await getMissingMetadataArtifacts(cacheDir, manifest)).length === 0
}

export async function writeMetadataArtifacts(
	cacheDir: string,
	payload: CoreMetadataPayload,
	status: MetadataArtifactStatus = 'ready',
	pulledAt = Date.now()
): Promise<void> {
	await fs.mkdir(cacheDir, { recursive: true })
	for (const [file, data] of getMetadataArtifactEntries(payload)) {
		await fs.writeFile(path.join(cacheDir, file), JSON.stringify(data))
	}
	await writeMetadataArtifactManifest(cacheDir, status, pulledAt)
}

export async function writeMissingMetadataStubArtifacts(cacheDir: string, pulledAt = Date.now()): Promise<void> {
	await fs.mkdir(cacheDir, { recursive: true })
	for (const [file, data] of getMetadataArtifactEntries(METADATA_CI_STUBS)) {
		const filePath = path.join(cacheDir, file)
		if (await fileExists(filePath)) {
			continue
		}
		await fs.writeFile(filePath, JSON.stringify(data))
	}
	await writeMetadataArtifactManifest(cacheDir, 'stub', pulledAt)
}

async function writeMetadataArtifactManifest(
	cacheDir: string,
	status: MetadataArtifactStatus,
	pulledAt: number
): Promise<void> {
	await fs.writeFile(
		getMetadataManifestPath(cacheDir),
		JSON.stringify(createMetadataArtifactManifest(status, pulledAt), null, 2)
	)
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath)
		return true
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false
		}
		throw error
	}
}
