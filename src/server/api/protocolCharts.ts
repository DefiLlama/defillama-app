import type { fetchAdapterProtocolChartDataByBreakdownType } from '~/containers/DimensionAdapters/api'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'

type AdapterBreakdownType = Parameters<typeof fetchAdapterProtocolChartDataByBreakdownType>[0]['type']

const VALID_ADAPTER_TYPES = new Set<string>(Object.values(ADAPTER_TYPES))
const VALID_ADAPTER_DATA_TYPES = new Set<string>(Object.values(ADAPTER_DATA_TYPES))
const VALID_ADAPTER_BREAKDOWN_TYPES = new Set<AdapterBreakdownType>(['chain', 'version'])

type AdapterBreakdownRequest =
	| {
			ok: true
			value: {
				adapterType: `${ADAPTER_TYPES}`
				protocol: string
				type: AdapterBreakdownType
				dataType?: `${ADAPTER_DATA_TYPES}`
			}
	  }
	| { ok: false; error: string }

const isValidAdapterType = (value: string): value is `${ADAPTER_TYPES}` => VALID_ADAPTER_TYPES.has(value)

const isValidAdapterDataType = (value: string): value is `${ADAPTER_DATA_TYPES}` => VALID_ADAPTER_DATA_TYPES.has(value)

const isValidAdapterBreakdownType = (value: string): value is AdapterBreakdownType =>
	VALID_ADAPTER_BREAKDOWN_TYPES.has(value as AdapterBreakdownType)

export const parseAdapterBreakdownRequest = (params: {
	adapterType?: string
	protocol?: string
	type?: string
	dataType?: string
}): AdapterBreakdownRequest => {
	const { adapterType, protocol, type, dataType } = params

	if (!adapterType || !protocol || !type) {
		return { ok: false, error: 'adapterType, protocol, and type parameters are required' }
	}
	if (!isValidAdapterType(adapterType)) {
		return { ok: false, error: `Invalid adapterType: ${adapterType}` }
	}
	if (!isValidAdapterBreakdownType(type)) {
		return { ok: false, error: `Invalid type: ${type}` }
	}

	const validatedDataType = dataType && isValidAdapterDataType(dataType) ? dataType : undefined
	if (dataType && !validatedDataType) {
		return { ok: false, error: `Invalid dataType: ${dataType}` }
	}

	return {
		ok: true,
		value: {
			adapterType,
			protocol,
			type,
			...(validatedDataType ? { dataType: validatedDataType } : {})
		}
	}
}
