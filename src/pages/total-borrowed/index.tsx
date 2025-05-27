import { maxAgeForNext } from '~/api'
import { BorrowedByChain } from '~/containers/TotalBorrowed/BorrowedByChain'
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

export default function TotalBorrowed(props) {
	return (
		<Layout title="Total Borrowed - DefiLlama">
			<BorrowedByChain {...props} />
		</Layout>
	)
}
