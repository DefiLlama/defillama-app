import { DesktopSearch } from '~/components/Search/Base/Desktop'
import type { ICommonSearchProps } from '../types'
import { useGetLiquidationSearchList } from './hooks'

interface ILiquidationsSearchProps extends ICommonSearchProps {}

export function LiquidationsSearch(props: ILiquidationsSearchProps) {
	const { data, loading } = useGetLiquidationSearchList({ disabled: false })

	return <DesktopSearch {...props} data={data} loading={loading} placeholder="Search liquidation levels..." />
}
