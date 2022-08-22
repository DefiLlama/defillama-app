import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetDexesSearchList } from './hooks'

interface IDexsSearchProps extends ICommonSearchProps {}

export default function DexsSearch(props: IDexsSearchProps) {
	const { data, loading } = useGetDexesSearchList()

	return <DesktopSearch {...props} data={data} loading={loading} />
}
