import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getOraclePageData, getOraclePageDataByChain } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import Oracles from '~/components/Oracles'

// @ts-ignore TODO: same reason as in another file, getOraclePageData cares too much
export const getStaticProps = withPerformanceLogging('oracles', async ({ params: { chain } }) => {
	const data = await getOraclePageDataByChain(chain as string)

	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const { props } = await getOraclePageData()

	const chainsByOracle = props ? props?.chainsByOracle : {}

	const chainsLits = [...new Set(Object.values(chainsByOracle).flat())]

	const paths = chainsLits.slice(0, 10).map((chain) => {
		return {
			params: { chain }
		}
	})

	return { paths, fallback: 'blocking' }
}

export default function OraclesPage(props) {
	return (
		<Layout title={`Oracles - DefiLlama`} defaultSEO>
			<Oracles {...props} />
		</Layout>
	)
}
