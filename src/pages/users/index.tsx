import * as React from 'react'
import { capitalizeFirstLetter } from '~/utils'
import { maxAgeForNext } from '~/api'
import { USER_METRICS_ALL_API } from '~/constants'
import UsersByChain from '~/containers/UsersByChain'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('users/index', async () => {
	try {
		const userMetrics = await fetch(`${USER_METRICS_ALL_API}`).then((res) => res.json())

		return {
			props: {
				name: 'Total User Metrics',
				chart: userMetrics?.chart?.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()),
				chains: ['All'].concat(userMetrics.chains).map((chain) => ({
					label: chain === 'avax' ? 'Avalanche' : capitalizeFirstLetter(chain),
					to: chain === 'All' ? '/users' : `/users/chain/${chain}`
				})),
				protocols: userMetrics.protocols || [],
				chain: 'All',
				revalidate: maxAgeForNext([22])
			}
		}
	} catch (error) {
		return {
			notFound: true
		}
	}
})

export default function Protocol({ name, chart, chains, protocols, chain }) {
	return <UsersByChain {...{ name, chart, chains, protocols, chain }} />
}
