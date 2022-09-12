import type { IBaseSearchProps } from '~/components/Search/types'
import { useEffect, useState } from 'react'
import { getAvailableAssetsList } from '~/utils/liquidations'

export const useAssetsList = () => {
	const [assetsList, setAssetsList] = useState<IBaseSearchProps['data']>([])
	useEffect(() => {
		const fetchAssetsList = async () => {
			const availableAssetsList = await getAvailableAssetsList()
			setAssetsList(availableAssetsList)
		}

		fetchAssetsList().catch(console.error)
	}, [])

	return assetsList
}
