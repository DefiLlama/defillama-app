import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { OraclesByChain } from '~/Oracles'
import { getOraclePageData, getOraclePageDataByChain } from '~/Oracles/queries'

export const getStaticProps = withPerformanceLogging('oracles/[chain]', async ({ params: { chain } }) => {
	const data = await getOraclePageDataByChain(chain as string)

	if (!data) {
		return { notFound: true }
	}

	return {
		props: { ...data },
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const data = await getOraclePageData()

	const chainsByOracle = data?.chainsByOracle ?? {}

	const chainsLits = [...new Set(Object.values(chainsByOracle).flat())]

	const paths = chainsLits.slice(0, 10).map((chain) => {
		return {
			params: { chain }
		}
	})

	return { paths, fallback: 'blocking' }
}

export default function OraclesPage(props) {
	return <OraclesByChain {...props} />
}
