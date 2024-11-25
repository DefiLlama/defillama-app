import { getAvailableAssetsList } from '~/utils/liquidations'
import { useQuery } from '@tanstack/react-query'
import { IGetSearchList } from '../types'

export function useGetLiquidationSearchList({ disabled }: { disabled?: boolean }): IGetSearchList {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['liquidation-serach-list'],
		queryFn: () =>
			getAvailableAssetsList().catch((err) => {
				console.error(err)
				return null
			}),
		staleTime: 60 * 60 * 1000,
		enabled: !disabled
	})

	return { data: data?.assets ?? null, loading: isLoading, error: isError }
}
