import { BRIDGES_SERVER_URL, DATASETS_SERVER_URL, RWA_PERPS_SERVER_URL, RWA_SERVER_URL, SERVER_URL } from '~/constants'

export type MetadataUpstreamKind = 'bridges' | 'core' | 'datasets' | 'rwa' | 'rwa-perps'

const METADATA_UPSTREAM_BASES = {
	bridges: BRIDGES_SERVER_URL,
	core: SERVER_URL,
	datasets: DATASETS_SERVER_URL,
	rwa: RWA_SERVER_URL,
	'rwa-perps': RWA_PERPS_SERVER_URL
} as const satisfies Record<MetadataUpstreamKind, string>

export function getMetadataUpstreamBase(kind: MetadataUpstreamKind): string {
	return METADATA_UPSTREAM_BASES[kind]
}
