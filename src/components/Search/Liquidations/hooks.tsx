import { useEffect, useState } from 'react'
import { getAvailableAssetsList } from '~/utils/liquidations'
import type { IGetSearchList } from '../types'

export function useGetLiquidationSearchList(): IGetSearchList {
	const [searchList, setSearchList] = useState<IGetSearchList>({ data: [], loading: true })
	useEffect(() => {
		const fetchAssetsList = async () => {
			const availableAssetsList = await getAvailableAssetsList()
			setSearchList({ data: availableAssetsList.assets, loading: false })
		}

		fetchAssetsList().catch((err) => {
			console.error(err)
		})
	}, [])
	return searchList
}
