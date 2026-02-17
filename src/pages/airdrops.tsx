import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { getAirdropsProtocols } from '~/containers/Protocols/queries'
import { RecentProtocols } from '~/containers/Protocols/RecentProtocols'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('airdrops', async () => {
	const data = await getAirdropsProtocols()

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Tokenless protocols']

export default function Protocols(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Tokenless protocols that may airdrop - DefiLlama"
			description={`Tokenless protocols that may airdrop. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`tokenless protocols, DeFi airdrops, potential airdrops, crypto airdrops, DefiLlama airdrops`}
			canonicalUrl={`/airdrops`}
			pageName={pageName}
		>
			<RecentProtocols {...props} />
		</Layout>
	)
}
