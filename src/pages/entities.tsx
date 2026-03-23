import type { InferGetStaticPropsType } from 'next'
import { Treasuries } from '~/containers/Treasuries'
import { getEntitiesPageData } from '~/containers/Treasuries/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Entities', 'ranked by', 'Treasury']

export const getStaticProps = withPerformanceLogging('entities', async () => {
	const data = await getEntitiesPageData()
	return {
		props: { data, entity: true },
		revalidate: maxAgeForNext([22])
	}
})

export default function Entities(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="DeFi Entities & Organizations - DefiLlama"
			description="Track entity and organization treasury holdings on DefiLlama. Compare asset breakdowns, stablecoins, and own tokens across blockchain entities."
			canonicalUrl="/entities"
			pageName={pageName}
		>
			<Treasuries {...props} />
		</Layout>
	)
}
