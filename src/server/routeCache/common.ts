import type { MetadataCache } from '~/utils/metadata/artifactContract'

export type StaticParamPath<Param extends string> = {
	params: Record<Param, string>
}

export async function getMetadataCache(): Promise<MetadataCache> {
	const metadataModule = await import('~/utils/metadata')
	return metadataModule.default
}

export function normalizeQueryParam(value: string | string[] | undefined): string | null {
	if (typeof value === 'string' && value.length > 0) return value
	if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) return value[0]
	return null
}
