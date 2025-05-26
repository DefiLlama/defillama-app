import { getDimensionProtocolPageData } from '~/api/categories/adaptors'
import { useQuery } from '@tanstack/react-query'
import { ADAPTER_TYPES } from '../constants'

export const useGetDimensionAdapterChartData = ({
	protocolName,
	adapterType,
	metadata,
	disabled
}: {
	protocolName: string
	adapterType: `${ADAPTER_TYPES}`
	disabled?: boolean
	metadata?: { bribeRevenue?: boolean; tokenTax?: boolean }
}) => {
	return useQuery({
		queryKey: ['adaptor-chart-data', protocolName, adapterType, disabled, metadata],
		queryFn: !disabled
			? () =>
					getDimensionProtocolPageData({ protocolName, adapterType, metadata }).then((data) => {
						if (!data || data.totalDataChart[0].length === 0) return null
						return data
					})
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}
