import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { OracleOverview } from '~/containers/Oracles/OracleOverview'
import { getOraclePageData } from '~/containers/Oracles/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('oracles/[oracle]/[chain]', async ({ params }) => {
	if (!params?.oracle || !params?.chain) {
		return { notFound: true, props: null }
	}

	const oracle = Array.isArray(params.oracle) ? params.oracle[0] : params.oracle
	const chain = Array.isArray(params.chain) ? params.chain[0] : params.chain
	const data = await getOraclePageData({ oracle, chain })

	if (data && 'notFound' in data) {
		return { notFound: true }
	}

	if (!data) {
		throw new Error(`Failed to load /oracles/${oracle}/${chain} page data`)
	}

	return {
		props: { ...data },
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function OraclesOracleChainPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return <OracleOverview {...props} />
}
