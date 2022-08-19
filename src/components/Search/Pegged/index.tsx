import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { usePeggedSearchList } from './hooks'

interface IPeggedSearchProps extends ICommonSearchProps {}

// TODO add pegged chains list
export default function PeggedSearch(props: IPeggedSearchProps) {
	const { data, loading } = usePeggedSearchList()

	return <DesktopSearch {...props} data={data} loading={loading} />
}
