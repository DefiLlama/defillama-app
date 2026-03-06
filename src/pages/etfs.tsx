import { ETFOverview } from '~/containers/ETF'
import { getETFData } from '~/containers/ETF/queries'
import type { ETFOverviewProps } from '~/containers/ETF/types'
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
			title={`ETF Analytics & Market Data - DefiLlama`}
			description={`Analyze exchange traded funds with ETF statistics, performance metrics, assets, and flows. Transparent, ad-free ETF data powered by DefiLlama.`}
			canonicalUrl={`/etfs`}
			pageName={pageName}
		>
			<ETFOverview {...props} />
		</Layout>
	)
}
