import * as React from 'react'
import { useFetchDexsList } from '~/api/categories/dexs/client'
import { chainIconUrl, standardizeProtocolName, tokenIconUrl } from '~/utils'
import type { IBaseSearchProps, IGetSearchList } from '../types'

export function useGetDexesSearchList(onlyChains?: boolean): IGetSearchList {
	const { data, loading } = useFetchDexsList()

	const searchData: IBaseSearchProps['data'] = React.useMemo(() => {
		const list = onlyChains === true ? data?.allChains?.map((chain) => ({ name: chain })) : data?.dexs
		const urlPrefix = onlyChains === true ? '/dexs' : '/dex'
		const iconUrl = onlyChains === true ? chainIconUrl : tokenIconUrl

		return (
			list?.map((asset) => ({
				logo: iconUrl(asset.name),
				route: `${urlPrefix}/${standardizeProtocolName(asset.name)}`,
				name: asset.name
			})) ?? []
		)
	}, [data, onlyChains])

	return { data: searchData, loading, error: !data && !loading }
}
