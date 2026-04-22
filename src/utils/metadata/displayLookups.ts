import { slug } from '~/utils'

const DEFAULT_PROTOCOL_FALLBACK_SLUG = 'morpho-blue'
const DEFAULT_PROTOCOL_FALLBACK_NAME = 'Morpho Blue'

export function buildProtocolDisplayNameLookupRecord(
	protocolMetadata: Record<string, { name?: string; displayName?: string }>
): Record<string, string> {
	const lookup: Record<string, string> = {}

	for (const metadata of Object.values(protocolMetadata)) {
		if (!metadata?.name) continue
		lookup[metadata.name] = metadata.displayName ?? metadata.name
	}

	// TODO: remove this once morpho-blue display metadata is present in the metadata pipeline.
	if (lookup[DEFAULT_PROTOCOL_FALLBACK_SLUG] == null) {
		lookup[DEFAULT_PROTOCOL_FALLBACK_SLUG] = DEFAULT_PROTOCOL_FALLBACK_NAME
	}

	return lookup
}

export function buildChainDisplayNameLookupRecord(
	chainMetadata: Record<string, { name?: string }>
): Record<string, string> {
	const lookup: Record<string, string> = {}

	for (const metadata of Object.values(chainMetadata)) {
		if (!metadata?.name) continue
		lookup[slug(metadata.name)] = metadata.name
	}

	return lookup
}

export function createStringLookupMap(lookup: Record<string, string>): Map<string, string> {
	return new Map(Object.entries(lookup))
}
