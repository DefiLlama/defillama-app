import { ConnectButton } from '@rainbow-me/rainbowkit'

import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/chains'
import { withPerformanceLogging } from '~/utils/perf'
import { ChainContainer } from '~/containers/ProContainer'
import { WalletConfig } from '~/layout/WalletConfig'

export const getStaticProps = withPerformanceLogging('index/pro', async () => {
	const data = await getChainPageData()

	return {
		props: {
			...data.props,
			totalFundingAmount: data.props.raisesChart
				? Object.values(data.props.raisesChart).reduce((acc, curr) => (acc += curr), 0) * 1e6
				: null
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage(props) {
	return (
		<WalletConfig>
			<Layout title="DefiLlama - DeFi Dashboard">
				<span className="ml-auto">
					<ConnectButton />
				</span>
				<ChainContainer {...props} />
			</Layout>
		</WalletConfig>
	)
}
