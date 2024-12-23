import * as React from 'react'
import Layout from '~/layout'
import ChainsContainer from '~/containers/Defi/Chains'
import { maxAgeForNext } from '~/api'
import { getNewChainsPageData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'chains/[...category]',
	async ({
		params: {
			category: [category]
		}
	}) => {
		const data = await getNewChainsPageData(category)
		return {
			...data,
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Chains(props) {
	const { category } = props
	return (
		<Layout title={`${category} TVL - DefiLlama`} defaultSEO>
			<ChainsContainer {...props} />
		</Layout>
	)
}
