import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetBridgesSearchList } from './hooks'

interface IBridgesSearchProps extends ICommonSearchProps {
	onToggleClick?: (enabled: boolean) => void
}

export default function BridgesSearch(props: IBridgesSearchProps) {
	const { data, loading } = useGetBridgesSearchList()

	return <DesktopSearch {...props} data={data} loading={loading} />
}
