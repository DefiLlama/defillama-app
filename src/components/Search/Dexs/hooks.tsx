import * as React from 'react'
import { useFetchDexsList } from '~/api/categories/dexs/client'
import { chainIconUrl, standardizeProtocolName, tokenIconUrl } from '~/utils'
import type { IBaseSearchProps, IGetSearchList } from '../types'

export function useGetDexesSearchList(onlyChains?: boolean): IGetSearchList {
	const { data, loading } = useFetchDexsList()
	const list = onlyChains === true ? data?.allChains?.map((chain) => ({ name: chain })) : data?.dexs
	const urlPrefix = onlyChains === true ? '/dexs' : '/dex'
	const iconUrl = onlyChains === true ? tokenIconUrl : chainIconUrl
	const searchData: IBaseSearchProps['data'] = React.useMemo(
		() =>
			list?.map((asset) => ({
				logo: iconUrl(asset.name),
				route: `${urlPrefix}/${standardizeProtocolName(asset.name)}`,
				name: asset.name
			})) ?? [],
		[data]
	)

	return { data: searchData, loading, error: !data && !loading }
}
