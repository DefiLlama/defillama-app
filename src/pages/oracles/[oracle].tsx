import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { OracleOverview } from '~/containers/Oracles/OracleOverview'
import { getOraclePageData, getOraclesPagePaths } from '~/containers/Oracles/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('oracles/[oracle]', async ({ params }) => {
	if (!params?.oracle) {
		return { notFound: true, props: null }
	}

	const oracle = Array.isArray(params.oracle) ? params.oracle[0] : params.oracle
	const data = await getOraclePageData({ oracle })

	if (data && 'notFound' in data) {
		return { notFound: true }
	}

	if (!data) {
		throw new Error(`Failed to load /oracles/${oracle} page data`)
	}

	return {
		props: { ...data },
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const paths = await getOraclesPagePaths()
	return { paths, fallback: 'blocking' }
}

export default function OraclesPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return <OracleOverview {...props} />
}
