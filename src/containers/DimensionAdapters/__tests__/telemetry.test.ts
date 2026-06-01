import { beforeEach, describe, expect, it, vi } from 'vitest'

const { addRouteTelemetryAttributesMock } = vi.hoisted(() => ({
	addRouteTelemetryAttributesMock: vi.fn()
}))

vi.mock('~/utils/telemetry', () => ({
	addRouteTelemetryAttributes: addRouteTelemetryAttributesMock
}))

import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '../constants'
import { addDimensionChainRouteTelemetry } from '../telemetry'

describe('dimension adapter route telemetry', () => {
	beforeEach(() => {
		addRouteTelemetryAttributesMock.mockReset()
	})

	it('adds shared dimension chain route attributes', () => {
		addDimensionChainRouteTelemetry({
			adapterType: ADAPTER_TYPES.FEES,
			chain: 'Litecoin',
			canonicalRoute: '/fees/chain/[chain]',
			dataType: ADAPTER_DATA_TYPES.DAILY_FEES,
			metadataFlag: 'fees'
		})

		expect(addRouteTelemetryAttributesMock).toHaveBeenCalledWith({
			adapter_type: 'fees',
			canonical_route: '/fees/chain/[chain]',
			chain: 'Litecoin',
			data_type: 'dailyFees',
			metadata_flag: 'fees'
		})
	})

	it('omits data_type when the route does not define one', () => {
		addDimensionChainRouteTelemetry({
			adapterType: ADAPTER_TYPES.FEES,
			chain: 'Ethereum',
			canonicalRoute: '/pf/chain/[chain]',
			metadataFlag: 'fees'
		})

		expect(addRouteTelemetryAttributesMock).toHaveBeenCalledWith({
			adapter_type: 'fees',
			canonical_route: '/pf/chain/[chain]',
			chain: 'Ethereum',
			metadata_flag: 'fees'
		})
	})
})
