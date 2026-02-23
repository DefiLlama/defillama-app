import { Cexs } from '~/containers/Cexs'
import { getCexsPageData } from '~/containers/Cexs/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('cexs/index', async () => {
	const data = await getCexsPageData()
	return {
		props: data,
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
}
