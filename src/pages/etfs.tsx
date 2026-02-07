import { ETFOverview, ETFOverviewProps } from '~/containers/ETF'
import { getETFData } from '~/containers/ETF/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('etfs', async () => {
	const data = await getETFData()

	return {
		props: {
			...data
		},
		revalidate: 5 * 60
	}
})

const pageName = ['ETFs: Overview']

export default function ETFs(props: ETFOverviewProps) {
	return (
		<Layout
			title={`Exchange Traded Funds - DefiLlama`}
			description={`Exchange Traded Funds on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`etfs, crypto etfs, exchange traded funds`}
			canonicalUrl={`/etfs`}
			pageName={pageName}
		>
			<ETFOverview {...props} />
		</Layout>
	)
}
