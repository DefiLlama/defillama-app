import * as React from 'react'
import { useFetchAdaptorsList } from '~/api/categories/adaptors/client'
import { chainIconUrl, standardizeProtocolName, tokenIconUrl } from '~/utils'
import type { IBaseSearchProps, IGetSearchList } from '../types'

export function useGetAdaptorsSearchList(type: string, onlyChains?: boolean): IGetSearchList {
	const { data, loading } = useFetchAdaptorsList(type)

	const searchData: IBaseSearchProps['data'] = React.useMemo(() => {
		const list = (onlyChains === true ? data?.allChains.map((chain) => ({ name: chain })) : data?.protocols) ?? []
		const urlPrefix = onlyChains === true ? `/${type}/chain` : `/${type}`
		const iconUrl = onlyChains === true ? chainIconUrl : tokenIconUrl

		return list.map((asset) => ({
			logo: iconUrl(asset.name),
			route: `${urlPrefix}/${standardizeProtocolName(asset.name)}`,
			name: asset.name
		}))
	}, [data, onlyChains, type])

	return { data: searchData, loading, error: !data && !loading }
}
