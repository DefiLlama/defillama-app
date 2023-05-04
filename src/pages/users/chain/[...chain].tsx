import * as React from 'react'
import { capitalizeFirstLetter } from '~/utils'
import { maxAgeForNext } from '~/api'
import { USER_METRICS_ALL_API, USER_METRICS_CHAIN_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'
import UsersByChain from '~/containers/UsersByChain'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	/*
	const res = await fetch(`${USER_METRICS_ALL_API}`).then((res) => res.json())
	
	const paths: string[] = res.chains.slice(0, 30).map((chain) => ({
		params: { chain: [chain] }
	}))
	*/

	return { paths: [], fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	'aggregators/[item]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		try {
			const [userMetrics, { chains }] = await arrayFetcher([
				`${USER_METRICS_CHAIN_API}/${chain}`,
				`${USER_METRICS_ALL_API}`
			])

			const chainName = capitalizeFirstLetter(chain === 'avax' ? 'avalanche' : chain)

			return {
				props: {
					chart: userMetrics?.chart?.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()),
					name: chainName,
					chains: ['All'].concat(chains).map((chain) => ({
						label: chain === 'avax' ? 'Avalanche' : capitalizeFirstLetter(chain),
						to: chain === 'All' ? '/users' : `/users/chain/${chain}`
					})),
					protocols: userMetrics.protocols || [],
					chain: chainName,
					revalidate: maxAgeForNext([22])
				}
			}
		} catch (error) {
			return {
				notFound: true
			}
		}
	}
)

export default function Protocol({ name, logo, backgroundColor, chart, chains, protocols, chain }) {
	return <UsersByChain {...{ name, logo, backgroundColor, chart, chains, protocols, chain }} />
}
