import * as React from 'react'
import { capitalizeFirstLetter } from '~/utils'
import { addMaxAgeHeaderForNext } from '~/api'
import { USER_METRICS_ALL_API, USER_METRICS_CHAIN_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'
import UsersByChain from '~/containers/UsersByChain'
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({
	params: {
		chain: [chain]
	},
	res
}) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
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
				chain: chainName
			}
		}
	} catch (error) {
		return {
			notFound: true
		}
	}
}

export default function Protocol({ name, logo, backgroundColor, chart, chains, protocols, chain }) {
	return <UsersByChain {...{ name, logo, backgroundColor, chart, chains, protocols, chain }} />
}
