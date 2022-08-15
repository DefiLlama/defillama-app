import { BaseSearch } from '~/components/Search/BaseSearch'
import type { ICommonSearchProps } from '~/components/Search/BaseSearch'
import { DEFAULT_ASSETS_LIST } from '~/utils/liquidations'

interface ILiquidationsSearchProps extends ICommonSearchProps {}

export default function LiquidationsSearch(props: ILiquidationsSearchProps) {
	const loading = false
	const assetsList = DEFAULT_ASSETS_LIST

	return <BaseSearch {...props} data={assetsList} loading={loading} placeholder="Search liquidation levels..." />
}
