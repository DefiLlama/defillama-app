import { ConnectButton } from '@rainbow-me/rainbowkit'

import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/chains'
import { withPerformanceLogging } from '~/utils/perf'
import { ChainContainer } from '~/containers/ProContainer'
import { WalletProvider } from '~/layout/WalletProvider'

export const getStaticProps = withPerformanceLogging('index/pro', async () => {
	const data = await getChainPageData()

	return {
		props: {
			...data.props,
			totalFundingAmount: data.props.raisesChart
				? (Object.values(data.props.raisesChart).reduce(
						(acc, curr) => ((acc as number) += (curr ?? 0) as number),
						0
				  ) as number) * 1e6
				: null
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage(props) {
	return (
		<WalletProvider>
			<Layout title="DefiLlama - DeFi Dashboard">
				<span className="ml-auto">
					<ConnectButton />
				</span>
				<ChainContainer {...props} />
			</Layout>
		</WalletProvider>
	)
}
