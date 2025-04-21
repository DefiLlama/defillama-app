import * as React from 'react'
import { useFetchBridgeList } from '~/containers/Bridges/queries.client'
import { slug } from '~/utils'
import type { IBaseSearchProps, IGetSearchList } from '../types'

// TODO add bridges chains list
export function useGetBridgesSearchList(): IGetSearchList {
	const { data, isLoading, isError } = useFetchBridgeList()

	const searchData: IBaseSearchProps['data'] = React.useMemo(
		() =>
			data?.bridges?.map((bridge) => ({
				route: `/bridge/${slug(bridge.displayName)}`,
				name: `${bridge.displayName}`
			})) ?? [],
		[data]
	)

	return { data: searchData, loading: isLoading, error: isError }
}
