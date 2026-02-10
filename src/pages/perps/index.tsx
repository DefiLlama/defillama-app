import { maxAgeForNext } from '~/api'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.PERPS
const type = 'Perp Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: 'perps',
		hasOpenInterest: true
	}).catch((e) => console.info(`Chain page data not found ${adapterType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	const perpsContext = {
		total24h: data.total24h,
		total7d: data.total7d,
		change_1d: data.change_1d,
		change_7dover7d: data.change_7dover7d,
		change_1m: data.change_1m,
		openInterest: data.openInterest,
		topProtocols: data.protocols.slice(0, 15).map((p) => ({
			name: p.name,
			volume24h: p.total24h,
			volume7d: p.total7d,
			openInterest: p.openInterest,
			chains: p.chains?.slice(0, 3)
		}))
	}
	const { questions: entityQuestions } = await fetchEntityQuestions('perps', 'page', perpsContext)

	return {
		props: { ...data, entityQuestions },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const PerpsVolumeOnAllChains = (props) => {
	return (
		<Layout
			title={`${type} by Protocol - DefiLlama`}
			description={`${type} by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${type} by protocol`}
			canonicalUrl={`/perps`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default PerpsVolumeOnAllChains
