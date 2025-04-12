import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { ChainsByCategory } from '~/containers/ChainsByCategory'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'

export const getStaticProps = withPerformanceLogging(
	'chains/[...category]',
	async ({
		params: {
			category: [category]
		}
	}) => {
		const data = await getChainsByCategory({ category })
		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Chains(props) {
	return <ChainsByCategory {...props} />
}
