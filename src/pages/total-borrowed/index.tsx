import { maxAgeForNext } from '~/api'
import { BorrowedProtocolsTVLByChain } from '~/containers/TotalBorrowed/BorrowedByChain'
import { getTotalBorrowedByChain } from '~/containers/TotalBorrowed/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`total-borrowed/index`, async () => {
	const data = await getTotalBorrowedByChain({ chain: 'All' })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Total Value Borrowed']

export default function TotalBorrowed(props) {
	return (
		<Layout
			title="Total Borrowed - DefiLlama"
			description={`Total Borrowed by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`total value borrowed by protocol`}
			canonicalUrl={`/total-borrowed`}
			pageName={pageName}
		>
			<BorrowedProtocolsTVLByChain {...props} />
		</Layout>
	)
}
