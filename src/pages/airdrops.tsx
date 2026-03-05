import type { InferGetStaticPropsType } from 'next'
import { getAirdropsProtocols } from '~/containers/Protocols/queries'
import { RecentProtocols } from '~/containers/Protocols/RecentProtocols'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
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
			title="Crypto Airdrops - Tokenless DeFi Protocols List - DefiLlama"
			description="Discover DeFi protocols without tokens that may launch airdrops. Track 200+ tokenless projects across lending, DEXs, derivatives, and more. Early access to potential retroactive airdrop opportunities."
			canonicalUrl={`/airdrops`}
			pageName={pageName}
		>
			<RecentProtocols {...props} />
		</Layout>
	)
}
