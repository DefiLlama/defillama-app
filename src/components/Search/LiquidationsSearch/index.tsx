import { BaseSearch } from '~/components/Search/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from '~/components/Search/BaseSearch'
import { useEffect, useState } from 'react'
import { DEFAULT_ASSETS_LIST } from '~/utils/liquidations'

interface ILiquidationsSearchProps extends ICommonSearchProps {}

export default function LiquidationsSearch(props: ILiquidationsSearchProps) {
	const loading = false
	const [assetsList, setAssetsList] = useState<IBaseSearchProps['data']>([])
	useEffect(() => {
		const fetchAssetsList = async () => {
			setAssetsList(DEFAULT_ASSETS_LIST)
		}

		fetchAssetsList().catch(console.error)
	}, [])

	return <BaseSearch {...props} data={assetsList} loading={loading} placeholder="Search liquidation levels..." />
}
