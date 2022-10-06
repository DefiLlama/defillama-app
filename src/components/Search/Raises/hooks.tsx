import { getInvestorsList, useInvestorsList } from '~/api/categories/raises'
import { slug } from '~/utils'

export function useGetInvestorsList() {
	const { data, loading } = useInvestorsList()

	return {
		data: getInvestorsList(data).map((name) => ({ name, route: `/raises/${slug(name.toLowerCase())}` })),
		loading,
		error: !data && !loading,
		onSearchTermChange: null,
		onItemClick: null
	}
}
