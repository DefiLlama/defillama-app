import type { IBaseSearchProps } from '~/components/Search/types'
import { useEffect, useState } from 'react'
import { DEFAULT_ASSETS_LIST } from '~/utils/liquidations'

export const useAssetsList = () => {
	const [assetsList, setAssetsList] = useState<IBaseSearchProps['data']>([])
	useEffect(() => {
		const fetchAssetsList = async () => {
			setAssetsList(DEFAULT_ASSETS_LIST)
		}

		fetchAssetsList().catch(console.error)
	}, [])

	return assetsList
}
