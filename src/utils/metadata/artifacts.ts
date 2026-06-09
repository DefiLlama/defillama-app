import fs from 'node:fs'
import path from 'node:path'
import {
	METADATA_ARTIFACT_KEYS,
	METADATA_ARTIFACT_REGISTRY,
	METADATA_CI_STUBS,
	parseMetadataArtifact,
	type CoreMetadataPayload
} from './artifactContract'
import { getMetadataCacheDir } from './config'
import { METADATA_MANIFEST_FILE, parseMetadataArtifactManifest, type MetadataArtifactManifest } from './manifest'

export type LoadedMetadataArtifacts = {
	manifest: MetadataArtifactManifest | null
	payload: CoreMetadataPayload
}

function readJsonFileSync(filePath: string): unknown {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function loadMetadataArtifactsFromDisk(cacheDir = getMetadataCacheDir()): LoadedMetadataArtifacts {
	const manifest = parseMetadataArtifactManifest(readJsonFileSync(path.join(cacheDir, METADATA_MANIFEST_FILE)))
	const payload = {} as CoreMetadataPayload
	const writablePayload = payload as Record<keyof CoreMetadataPayload, unknown>

	for (const key of METADATA_ARTIFACT_KEYS) {
		const artifact = METADATA_ARTIFACT_REGISTRY[key]
		writablePayload[key] = parseMetadataArtifact(key, readJsonFileSync(path.join(cacheDir, artifact.file)))
	}

	return { manifest, payload }
}

export function loadMetadataArtifactsForBoot(cacheDir = getMetadataCacheDir()): LoadedMetadataArtifacts {
	try {
		return loadMetadataArtifactsFromDisk(cacheDir)
	} catch (error) {
		console.warn('[metadata] failed to load generated artifacts; using in-memory stubs:', error)
		return {
			manifest: null,
			payload: METADATA_CI_STUBS
		}
	}
}
