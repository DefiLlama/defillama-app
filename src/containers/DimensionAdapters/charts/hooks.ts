import { getDimensionProtocolPageData } from '~/api/categories/adaptors'
import { useQuery } from '@tanstack/react-query'
import { ADAPTOR_TYPES } from '../constants'

export const useGetDimensionAdapterChartData = ({
	protocolName,
	adapterType,
	disabled
}: {
	protocolName: string
	adapterType: `${ADAPTOR_TYPES}`
	disabled?: boolean
}) => {
	return useQuery({
		queryKey: ['adaptor-chart-data', protocolName, adapterType, disabled],
		queryFn: !disabled
			? () =>
					getDimensionProtocolPageData({ protocolName, adapterType }).then((data) => {
						if (!data || data.totalDataChart[0].length === 0) return null
						return data
					})
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})
}
