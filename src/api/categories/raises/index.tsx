import useSWR from 'swr'
import { RAISES_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'

export function getInvestorsList(data) {
	if (!data) return []

	const investors = new Set<string>()

	data.raises.forEach((r) => {
		r.leadInvestors.forEach((x: string) => {
			investors.add(x.trim())
		})

		r.otherInvestors.forEach((x: string) => {
			investors.add(x.trim())
		})
	})

	return Array.from(investors).sort()
}

export function useInvestorsList() {
	const { data, error } = useSWR(RAISES_API, fetcher)

	return {
		data,
		error,
		loading: !data && !error
	}
}
