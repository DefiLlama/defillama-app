import * as React from 'react'
import { useFetchPeggedList } from '~/api/categories/stablecoins/client'
import { peggedAssetIconUrl, standardizeProtocolName } from '~/utils'
import type { IBaseSearchProps } from '../types'

export function usePeggedSearchList() {
	const { data, loading } = useFetchPeggedList()

	const searchData: IBaseSearchProps['data'] = React.useMemo(
		() =>
			data?.peggedAssets?.map((asset) => ({
				logo: peggedAssetIconUrl(asset.name),
				route: `/stablecoin/${standardizeProtocolName(asset.name)}`,
				name: `${asset.name} (${asset.symbol})`
			})) ?? [],
		[data]
	)

	return { data: searchData, loading, error: !data && !loading }
}
