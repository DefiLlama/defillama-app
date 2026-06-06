import { addRouteTelemetryAttributes } from '~/utils/telemetry'
import type { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'

export function addDimensionChainRouteTelemetry({
	adapterType,
	canonicalRoute,
	chain,
	dataType,
	metadataFlag
}: {
	adapterType: `${ADAPTER_TYPES}`
	canonicalRoute: string
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
	metadataFlag: string
}) {
	addRouteTelemetryAttributes({
		adapter_type: adapterType,
		...(dataType ? { data_type: dataType } : null),
		chain,
		canonical_route: canonicalRoute,
		metadata_flag: metadataFlag
	})
}
