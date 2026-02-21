import type { InferGetStaticPropsType } from 'next'
import { HacksContainer } from '~/containers/Hacks'
import { getHacksPageData } from '~/containers/Hacks/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Hacks: Overview']

export const getStaticProps = withPerformanceLogging('hacks', async () => {
	const data = await getHacksPageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function Hacks(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Hacks - DefiLlama"
			description="Track hacks on all chains and DeFi protocols. View total value lost, breakdown by technique, and DeFi hacks on DefiLlama."
			keywords="total value hacked, total value lost in hacks, blockchain hacks, hacks on DeFi protocols, DeFi hacks"
			canonicalUrl="/hacks"
			pageName={pageName}
		>
			<HacksContainer {...props} />
		</Layout>
	)
}
