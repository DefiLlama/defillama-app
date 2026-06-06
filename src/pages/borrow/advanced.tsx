import { Announcement } from '~/components/Announcement'
import { disclaimer } from '~/containers/Yields/constants'
import { BorrowAggregatorAdvanced } from '~/containers/Yields/views/OptimizerView'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('borrow/advanced', async () => {
	const { getBorrowAdvancedPageMetadata } = await import('~/server/datasetCache/runtime/yields')
	const metadata = await getBorrowAdvancedPageMetadata()

	return {
		props: metadata,
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Borrow Aggregator: Advanced']

export default function YieldBorrow(data) {
	return (
		<Layout
			title={`Lend/Borrow optimizer - DefiLlama Yield`}
			description={`Find the cheapest way to borrow. Calculate the best lending routes. Compare supply APR, borrow APR, incentives and LTV across all protocols.`}
			canonicalUrl={`/borrow/advanced`}
			pageName={pageName}
		>
			<Announcement announcementId="yields-disclaimer" version="2026-03">
				{disclaimer}
			</Announcement>
			<BorrowAggregatorAdvanced {...data} />
		</Layout>
	)
}
