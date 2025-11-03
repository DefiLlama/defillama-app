import { maxAgeForNext } from '~/api'
import { CEXS_API } from '~/constants'
import { Cexs } from '~/containers/Cexs'
import { ICex } from '~/containers/Cexs/types'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('cexs/index', async () => {
	const data: { cexs: Array<ICex> } = await fetchJson(CEXS_API)

	const cexs = {}

	for (const cex of data.cexs) {
		if (cex.name === 'MEXC') {
			cex.inflows_24h = null
			cex.inflows_1w = null
			cex.inflows_1m = null
		}
		cexs[cex.name] = { ...(cexs[cex.name] ?? {}), ...cex }
	}

	const finalCexs = []
	for (const cex in cexs) {
		finalCexs.push(cexs[cex])
	}

	return {
		props: {
			cexs: finalCexs.sort((a, b) => b.cleanAssetsTvl - a.cleanAssetsTvl)
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['CEXs', 'ranked by', 'Assets']

export default function CexsPage({ cexs }) {
	return (
		<Layout
			title={`CEX Transparency - DefiLlama`}
			description={`CEX Transparency on DefiLlama. CEXs ranked by assets. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`cex transparency, cex assets, cex rankings`}
			canonicalUrl={`/cexs`}
			pageName={pageName}
		>
			<Cexs cexs={cexs} />
		</Layout>
	)
} // trigger
