import type { GetStaticProps, InferGetStaticPropsType } from 'next'
import type { ComponentProps } from 'react'
import { ChainsWithStablecoins } from '~/containers/Stablecoins/ChainsWithStablecoins'
import { getStablecoinChainsPageData } from '~/containers/Stablecoins/queries.server'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

type StablecoinChainsPageProps = ComponentProps<typeof ChainsWithStablecoins>

export const getStaticProps: GetStaticProps<StablecoinChainsPageProps> = withPerformanceLogging(
	'stablecoins/chains',
	async () => {
		const props = await getStablecoinChainsPageData()

		if (!props.chainCirculatings || props.chainCirculatings.length === 0) {
			throw new Error('getStablecoinChainsPageData() broken')
		}

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Chains', 'ranked by', 'Stablecoins Supply']

export default function StablecoinChainsPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`Stablecoins by Chain - Market Cap & Supply - DefiLlama`}
			description={`Compare stablecoin market cap, circulating supply, and usage across blockchains. Analyze stablecoin distribution, inflows, and trends by chain with transparent data from DefiLlama.`}
			canonicalUrl="/stablecoins/chains"
			pageName={pageName}
		>
			<ChainsWithStablecoins {...props} />
		</Layout>
	)
}
