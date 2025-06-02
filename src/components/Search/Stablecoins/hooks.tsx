import * as React from 'react'
import { useFetchStablecoinsList } from '~/containers/Stablecoins/queries.client'
import { peggedAssetIconUrl, slug } from '~/utils'
import type { IBaseSearchProps, IGetSearchList } from '../types'

// TODO add pegged chains list
export function useGetStablecoinsSearchList({ disabled }: { disabled?: boolean }): IGetSearchList {
	const { data, isLoading, isError } = useFetchStablecoinsList({ disabled })

	const searchData: IBaseSearchProps['data'] = React.useMemo(
		() =>
			data?.peggedAssets?.map((asset) => ({
				logo: peggedAssetIconUrl(asset.name),
				route: `/stablecoin/${slug(asset.name)}`,
				name: `${asset.name} (${asset.symbol})`,
				...(asset.deprecated ? { deprecated: true } : {})
			})) ?? [],
		[data]
	)

	return { data: searchData, loading: isLoading, error: isError }
}
