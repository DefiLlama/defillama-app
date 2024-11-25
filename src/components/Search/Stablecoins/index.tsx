import { DesktopSearch } from '~/components/Search/Base/Desktop'
import type { ICommonSearchProps } from '../types'
import { useGetStablecoinsSearchList } from './hooks'

interface IPeggedSearchProps extends ICommonSearchProps {
	variant?: 'primary' | 'secondary'
}

export function PeggedSearch(props: IPeggedSearchProps) {
	const { data, loading } = useGetStablecoinsSearchList({ disabled: false })

	return <DesktopSearch {...props} data={data} loading={loading} />
}
