import * as React from 'react'
import { useFetchDexsList } from '~/api/categories/dexs/client'
import { standardizeProtocolName, tokenIconUrl } from '~/utils'
import type { IBaseSearchProps } from '../types'

export function useGetDexesSearchList() {
	const { data, loading } = useFetchDexsList()

	const searchData: IBaseSearchProps['data'] = React.useMemo(
		() =>
			data?.dexs?.map((asset) => ({
				logo: tokenIconUrl(asset.name),
				route: `/dex/${standardizeProtocolName(asset.name)}`,
				name: asset.name
			})) ?? [],
		[data]
	)

	return { data: searchData, loading, error: !data && !loading }
}
