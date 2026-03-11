import { LSTOverview } from '~/containers/LST'
import { getLSDPageData } from '~/containers/LST/queries'
import type { LSTOverviewProps } from '~/containers/LST/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('lsd', async () => {
	const data = await getLSDPageData()

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['LSTs: Overview']

export default function LSDs(props: LSTOverviewProps) {
	return (
		<Layout
			title="Liquid Staking (LST) Rankings - TVL & APY - DefiLlama"
			description="Compare liquid staking tokens by TVL, APY, and market share on DefiLlama."
			canonicalUrl={`/lst`}
			pageName={pageName}
		>
			<LSTOverview {...props} />
		</Layout>
	)
}
