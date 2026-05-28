import { METADATA_ARTIFACT_FILES } from './artifactContract'
import { getMetadataCacheMaxAgeMs } from './config'

export const METADATA_ARTIFACT_VERSION = 2
export const METADATA_MANIFEST_FILE = 'manifest.json'

export type MetadataArtifactStatus = 'ready' | 'stub'

export type MetadataArtifactManifest = {
	artifactVersion: typeof METADATA_ARTIFACT_VERSION
	pulledAt: number
	status: MetadataArtifactStatus
	artifacts: string[]
}

function getExpectedArtifacts(): string[] {
	return Object.values(METADATA_ARTIFACT_FILES)
}

function assertManifestArtifactsMatchRegistry(artifacts: unknown): string[] {
	if (!Array.isArray(artifacts)) {
		throw new Error('Metadata artifact manifest has invalid artifacts')
	}

	const expected = getExpectedArtifacts()
	if (artifacts.length !== expected.length) {
		throw new Error('Metadata artifact manifest artifact list does not match registry')
	}

	const seen = new Set<string>()
	for (const artifact of artifacts) {
		if (typeof artifact !== 'string') {
			throw new Error('Metadata artifact manifest includes a non-string artifact')
		}
		if (seen.has(artifact)) {
			throw new Error(`Metadata artifact manifest includes duplicate artifact ${artifact}`)
		}
		seen.add(artifact)
	}

	for (const artifact of expected) {
		if (!seen.has(artifact)) {
			throw new Error(`Metadata artifact manifest is missing ${artifact}`)
		}
	}

	return artifacts
}

export function createMetadataArtifactManifest(
	status: MetadataArtifactStatus,
	pulledAt = Date.now()
): MetadataArtifactManifest {
	return {
		artifactVersion: METADATA_ARTIFACT_VERSION,
		pulledAt,
		status,
		artifacts: getExpectedArtifacts()
	}
}

export function parseMetadataArtifactManifest(value: unknown): MetadataArtifactManifest {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error('Metadata artifact manifest must be an object')
	}

	const manifest = value as Record<string, unknown>
	if (manifest.artifactVersion !== METADATA_ARTIFACT_VERSION) {
		throw new Error(
			`Metadata artifact version mismatch: expected ${METADATA_ARTIFACT_VERSION}, got ${manifest.artifactVersion}`
		)
	}
	if (manifest.status !== 'ready' && manifest.status !== 'stub') {
		throw new Error('Metadata artifact manifest has invalid status')
	}
	if (typeof manifest.pulledAt !== 'number' || !Number.isFinite(manifest.pulledAt) || manifest.pulledAt < 0) {
		throw new Error('Metadata artifact manifest has invalid pulledAt')
	}

	return {
		artifactVersion: METADATA_ARTIFACT_VERSION,
		pulledAt: manifest.pulledAt,
		status: manifest.status,
		artifacts: assertManifestArtifactsMatchRegistry(manifest.artifacts)
	}
}

export function isMetadataArtifactManifestFresh(
	manifest: MetadataArtifactManifest | null,
	now = Date.now(),
	ttlMs = getMetadataCacheMaxAgeMs()
): boolean {
	const age = manifest ? now - manifest.pulledAt : 0
	return manifest !== null && manifest.status === 'ready' && age >= 0 && age <= ttlMs
}
