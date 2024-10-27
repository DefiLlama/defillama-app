import { useQuery } from '@tanstack/react-query'
import { RAISES_API } from '~/constants'
import { fetchApi } from '~/utils/async'

interface IRaisesFilters {
	investors: Array<string>
	rounds: Array<string>
	sectors: Array<string>
	chains: Array<string>
}

export function getRaisesFiltersList(data): IRaisesFilters {
	if (!data)
		return {
			investors: [],
			rounds: [],
			sectors: [],
			chains: []
		}

	const investors = new Set<string>()
	const rounds = new Set<string>()
	const sectors = new Set<string>()
	const chains = new Set<string>()

	data.raises.forEach((r) => {
		r.leadInvestors.forEach((x: string) => {
			investors.add(x.trim())
		})

		r.otherInvestors.forEach((x: string) => {
			investors.add(x.trim())
		})

		if (r.round) {
			rounds.add(r.round.trim())
		}

		if (r.category) {
			sectors.add(r.category.trim())
		}

		if (r.chains) {
			r.chains.forEach((chain) => chains.add(chain))
		}
	})

	return {
		investors: Array.from(investors).sort(),
		rounds: Array.from(rounds).sort(),
		sectors: Array.from(sectors).sort(),
		chains: Array.from(chains).sort()
	}
}

export function useInvestorsList() {
	return useQuery({ queryKey: [RAISES_API], queryFn: () => fetchApi(RAISES_API), staleTime: 60 * 60 * 1000 })
}
