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
			title="DeFi Hacks & Exploits Database - DefiLlama"
			description="Comprehensive database of DeFi hacks and crypto exploits. Track total value lost, exploit techniques, affected protocols, and historical security incidents. Real-time DeFi security analytics and vulnerability insights."
			canonicalUrl="/hacks"
			pageName={pageName}
		>
			<HacksContainer {...props} />
		</Layout>
	)
}
