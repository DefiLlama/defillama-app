import { METADATA_ARTIFACT_FILES } from './artifactContract'

export const METADATA_ARTIFACT_VERSION = 1
export const METADATA_MANIFEST_FILE = 'metadata-manifest.json'
export const METADATA_PULL_TTL_MS = 5 * 60 * 1000

export type MetadataArtifactStatus = 'ready' | 'stub'

export type MetadataArtifactManifest = {
	artifactVersion: typeof METADATA_ARTIFACT_VERSION
	pulledAt: number
	status: MetadataArtifactStatus
	artifacts: string[]
}

export function createMetadataArtifactManifest(
	status: MetadataArtifactStatus,
	pulledAt = Date.now()
): MetadataArtifactManifest {
	return {
		artifactVersion: METADATA_ARTIFACT_VERSION,
		pulledAt,
		status,
		artifacts: Object.values(METADATA_ARTIFACT_FILES)
	}
}

export function isMetadataArtifactManifestFresh(
	manifest: MetadataArtifactManifest | null,
	now = Date.now(),
	ttlMs = METADATA_PULL_TTL_MS
): boolean {
	return (
		manifest !== null &&
		manifest.artifactVersion === METADATA_ARTIFACT_VERSION &&
		manifest.status === 'ready' &&
		now - manifest.pulledAt <= ttlMs
	)
}
