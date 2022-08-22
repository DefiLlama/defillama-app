import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetLiquidationSearchList } from './hooks'

interface ILiquidationsSearchProps extends ICommonSearchProps {}

export default function LiquidationsSearch(props: ILiquidationsSearchProps) {
	const { data, loading } = useGetLiquidationSearchList()

	return <DesktopSearch {...props} data={data} loading={loading} placeholder="Search liquidation levels..." />
}
