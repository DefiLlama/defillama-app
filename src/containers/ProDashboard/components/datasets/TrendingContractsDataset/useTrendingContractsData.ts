import { useQuery } from '@tanstack/react-query'
import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

const valueToFilter = {
	'1d': 'day',
	'7d': 'week',
	'30d': 'month'
}

interface ITrendingContracts {
	accounts_percentage_growth: number
	active_accounts: number
	contract: string
	gas_spend: number
	gas_spend_percentage_growth: number
	txns: number
	txns_percentage_growth: number
	name?: string
}

async function getContracts(chain: string, time: string) {
	return await fetch(
		`https://trending-contracts-api.onrender.com/${chain}_tc/${valueToFilter[time] || valueToFilter['1d']}`
	)
		.then((res) => res.json())
		.then(async (r) => {
			return {
				results: await Promise.all(
					r.map(async (contract) => {
						let name = contract.name ? { name: contract.name } : undefined
						if (!name) {
							try {
								name = await fetch(
									`https://raw.githubusercontent.com/verynifty/RolodETH/main/data/${contract.contract.toLowerCase()}`
								).then((r) => r.json())
								if (name.name === undefined) {
									throw new Error('RolodETH: No name')
								}
							} catch (e) {
								try {
									name = await fetch(
										`https://api.llama.fi/contractName2/${chain}/${contract.contract.toLowerCase()}`
									).then((r) => r.json())
									if (name.name === '') {
										throw new Error('Etherescan: Contract not verified')
									}
								} catch (e) {
									name = undefined
								}
							}
						}
						return {
							...contract,
							name: name?.name
						}
					})
				)
			}
		})
}

export function useTrendingContractsData(chain: string = 'ethereum', timeframe: string = '1d') {
	const activeChain = chain.toLowerCase()

	return useQuery({
		queryKey: [`trending-contracts-${timeframe}${activeChain}`],
		queryFn: () => getContracts(activeChain, timeframe),
		staleTime: 60 * 60 * 1000,
		refetchInterval: 60 * 60 * 1000,
		enabled: true
	})
}