import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetStablecoinsSearchList } from './hooks'

interface IPeggedSearchProps extends ICommonSearchProps {}

export function PeggedSearch(props: IPeggedSearchProps) {
	const { data, loading } = useGetStablecoinsSearchList()

	return <DesktopSearch {...props} data={data} loading={loading} />
}
