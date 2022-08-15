import { BaseSearch } from '~/components/Search/BaseSearch'
import type { ICommonSearchProps } from '~/components/Search/BaseSearch'
import { useAssetsList } from '../../../utils/liquidations/useAssetsList'

interface ILiquidationsSearchProps extends ICommonSearchProps {}

export default function LiquidationsSearch(props: ILiquidationsSearchProps) {
	const loading = false
	const assetsList = useAssetsList()

	return <BaseSearch {...props} data={assetsList} loading={loading} placeholder="Search liquidation levels..." />
}
