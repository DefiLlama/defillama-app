import { useEffect, useState } from 'react'
import type { IBaseSearchProps } from '~/components/Search/types'
import { getAvailableAssetsList } from '~/containers/Liquidations/utils'

export const useAssetsList = () => {
	const [assetsList, setAssetsList] = useState<IBaseSearchProps['data']>([])
	useEffect(() => {
		const fetchAssetsList = async () => {
			const availableAssetsList = await getAvailableAssetsList()
			setAssetsList(availableAssetsList.assets)
		}

		fetchAssetsList().catch(console.error)
	}, [])

	return assetsList
}
