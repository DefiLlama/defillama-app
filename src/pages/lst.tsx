import { maxAgeForNext } from '~/api'
import { LSTOverview } from '~/containers/LST'
import { getLSDPageData } from '~/containers/LST/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('lsd', async () => {
	const data = await getLSDPageData()

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['LSTs: Overview']

export default function LSDs(props) {
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
