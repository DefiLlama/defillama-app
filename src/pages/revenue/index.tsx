import { maxAgeForNext } from '~/api'
import { feesOptions } from '~/components/Filters/options'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_REVENUE
const type = 'Revenue'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		dataType,
		chain: 'All',
		route: 'revenue',
		metricName: type
	}).catch((e) => console.info(`Chain page data not found ${adapterType}:${dataType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	const revenueContext = {
		total24h: data.total24h ?? null,
		total7d: data.total7d ?? null,
		change_1d: data.change_1d ?? null,
		change_7dover7d: data.change_7dover7d ?? null,
		change_1m: data.change_1m ?? null,
		topProtocols: data.protocols.slice(0, 15).map((p) => ({
			name: p.name,
			revenue24h: p.total24h ?? null,
			revenue7d: p.total7d ?? null,
			mcap: p.mcap ?? null,
			chains: p.chains?.slice(0, 3) ?? null
		}))
	}
	const { questions: entityQuestions } = await fetchEntityQuestions('revenue', 'page', revenueContext)

	return {
		props: { ...data, entityQuestions },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const RevenueOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title={`${type} by Protocol - DefiLlama`}
			description={`${type} by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${type} by protocol`}
			canonicalUrl={`/revenue`}
			metricFilters={feesOptions}
			metricFiltersLabel="Include in Revenue"
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default RevenueOnAllChains
