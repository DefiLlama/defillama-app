import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { OraclesByChain } from '~/containers/Oracles'
import { getOraclePageData, getOraclePageDataByChain } from '~/containers/Oracles/queries'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('oracles/[chain]', async ({ params }) => {
	if (!params?.chain) {
		return { notFound: true, props: null }
	}

	const chain = Array.isArray(params.chain) ? params.chain[0] : params.chain
	const data = await getOraclePageDataByChain(chain)

	if (!data || 'notFound' in data) {
		return { notFound: true }
	}

	return {
		props: { ...data },
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const data = await getOraclePageData()

	const chainsByOracle = data && 'chainsByOracle' in data ? data.chainsByOracle : {}

	const chainsList = [...new Set(Object.values(chainsByOracle).flat())]

	const paths = chainsList.slice(0, 10).map((chain) => {
		return {
			params: { chain: slug(chain) }
		}
	})

	return { paths, fallback: 'blocking' }
}

export default function OraclesPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return <OraclesByChain {...props} />
}
