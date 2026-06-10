import type { MetadataCache } from '~/utils/metadata/artifactContract'

export type StaticParamPath<Param extends string> = {
	params: Record<Param, string>
}

export async function getMetadataCache(): Promise<MetadataCache> {
	const metadataModule = await import('~/utils/metadata')
	return metadataModule.default
}
