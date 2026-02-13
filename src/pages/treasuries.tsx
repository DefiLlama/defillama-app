import { maxAgeForNext } from '~/api'
import { Treasuries } from '~/containers/Treasuries'
import { getTreasuryPageData } from '~/containers/Treasuries/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('treasuries', async () => {
	const data = await getTreasuryPageData()
	return {
		props: { data, entity: false },
		revalidate: maxAgeForNext([22])
	}
})

export default function TreasuriesPage(props) {
	return <Treasuries {...props} />
}
