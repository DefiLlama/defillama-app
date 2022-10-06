import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetInvestorsList } from './hooks'

interface IInvestorsSearchProps extends ICommonSearchProps {}

export default function InvestorsSearch(props: IInvestorsSearchProps) {
	const { data, loading } = useGetInvestorsList()

	return <DesktopSearch {...props} data={data} loading={loading} placeholder="Search investors..." />
}
