import * as React from 'react'
import { BaseSearch } from '~/components/Search/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from '~/components/Search/BaseSearch'
import { useFetchAssetsList } from '~/api/categories/liquidations/client'

interface ILiquidationsSearchProps extends ICommonSearchProps {
	pathname?: string
}

export default function LiquidationsSearch({ pathname, ...props }: ILiquidationsSearchProps) {
	const { data: assets, loading: fetchingAssets } = useFetchAssetsList()

	const searchData: IBaseSearchProps['data'] =
		React.useMemo(() => {
			const assetsList =
				assets?.map((el) => ({
					name: `${el.name} (${el.symbol.toUpperCase()})`,
					symbol: el.symbol.toUpperCase(),
					route: `${pathname}?token=${el.symbol.toUpperCase()}`,
					logo: el.image
				})) ?? []

			return [...assetsList]
		}, [assets, pathname]) ?? []

	return <BaseSearch {...props} data={searchData} loading={fetchingAssets} />
}
