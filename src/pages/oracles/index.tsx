import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { OraclesByChain } from '~/containers/Oracles'
import { getOraclePageData } from '~/containers/Oracles/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('oracles', async () => {
	const data = await getOraclePageData()

	if (!data || 'notFound' in data) {
		throw new Error('Failed to load /oracles page data')
	}

	return {
		props: { ...data },
		revalidate: maxAgeForNext([22])
	}
})

export default function OraclesPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return <OraclesByChain {...props} />
}
