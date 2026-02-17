import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { ProtocolsCategoriesPage } from '~/containers/ProtocolsByCategoryOrTag/CategoriesPage'
import { categoriesPageExcludedExtraTvls } from '~/containers/ProtocolsByCategoryOrTag/constants'
import { getProtocolsCategoriesPageData } from '~/containers/ProtocolsByCategoryOrTag/queries'
import type { IProtocolsCategoriesPageData } from '~/containers/ProtocolsByCategoryOrTag/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Protocol Categories']
const finalTvlOptions = tvlOptions.filter((option) => !categoriesPageExcludedExtraTvls.has(option.key))

export const getStaticProps = withPerformanceLogging('categories', async () => {
	const pageData = await getProtocolsCategoriesPageData()

	return {
		props: pageData,
		revalidate: maxAgeForNext([22])
	}
})

export default function CategoriesPage(props: IProtocolsCategoriesPageData) {
	return (
		<Layout
			title="Categories - DefiLlama"
			description="Combined TVL, Revenue and other metrics by category of all protocols that are tracked by DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="protocols categories, defi categories"
			canonicalUrl="/categories"
			metricFilters={finalTvlOptions}
			pageName={pageName}
		>
			<ProtocolsCategoriesPage {...props} />
		</Layout>
	)
}
