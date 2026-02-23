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
			title={`Liquid Staking Tokens - DefiLlama`}
			description={`Total Value Locked ETH Liquid Staking Tokens. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`liquid staking tokens, defi lst, total value locked eth lst`}
			canonicalUrl={`/lst`}
			pageName={pageName}
		>
			<LSTOverview {...props} />
		</Layout>
	)
}
