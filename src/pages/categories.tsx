import { tvlOptions } from '~/components/Filters/options'
import { ProtocolsCategoriesPage } from '~/containers/ProtocolsByCategoryOrTag/CategoriesPage'
import { categoriesPageExcludedExtraTvls } from '~/containers/ProtocolsByCategoryOrTag/constants'
import { getProtocolsCategoriesPageData } from '~/containers/ProtocolsByCategoryOrTag/queries'
import type { IProtocolsCategoriesPageData } from '~/containers/ProtocolsByCategoryOrTag/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Protocol Categories']
const finalTvlOptions = tvlOptions.filter((option) => !categoriesPageExcludedExtraTvls.has(option.key))

export const getStaticProps = withPerformanceLogging('categories', async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const pageData = await getProtocolsCategoriesPageData({ categoriesAndTags: metadataCache.categoriesAndTags })

	return {
		props: pageData,
		revalidate: maxAgeForNext([22])
	}
})

export default function CategoriesPage(props: IProtocolsCategoriesPageData) {
	return (
		<Layout
			title="Protocol Categories - DeFi TVL & Revenue Sectors - DefiLlama"
			description="Explore DeFi protocol categories: DEXs, Lending, Yield, Derivatives, and more. Compare sector TVL, revenue, and growth metrics. Category rankings and market share analytics for DeFi sectors."
			canonicalUrl="/categories"
			metricFilters={finalTvlOptions}
			pageName={pageName}
		>
			<ProtocolsCategoriesPage {...props} />
		</Layout>
	)
}
