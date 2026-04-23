import { slug } from '~/utils'

const PROTOCOL_FALLBACKs = {
	'morpho-v1': 'Morpho V1'
}

export function buildProtocolDisplayNameLookupRecord(
	protocolMetadata: Record<string, { name?: string; displayName?: string }>
): Record<string, string> {
	const lookup: Record<string, string> = {}

	for (const key in protocolMetadata) {
		const metadata = protocolMetadata[key]
		if (!metadata?.name) continue
		lookup[metadata.name] = metadata.displayName ?? metadata.name
	}

	for (const protocol in PROTOCOL_FALLBACKs) {
		if (lookup[protocol] == null) {
			lookup[protocol] = PROTOCOL_FALLBACKs[protocol]
		}
	}

	return lookup
}

export function buildChainDisplayNameLookupRecord(
	chainMetadata: Record<string, { name?: string }>
): Record<string, string> {
	const lookup: Record<string, string> = {}

	for (const key in chainMetadata) {
		const metadata = chainMetadata[key]
		if (!metadata?.name) continue
		lookup[slug(metadata.name)] = metadata.name
	}

	return lookup
}

export function createStringLookupMap(lookup: Record<string, string>): Map<string, string> {
	const map = new Map<string, string>()

	for (const key in lookup) {
		map.set(key, lookup[key])
	}

	return map
}
