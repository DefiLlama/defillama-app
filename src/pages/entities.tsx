import { maxAgeForNext } from '~/api'
import { Treasuries } from '~/containers/Treasuries'
import { getEntitiesPageData } from '~/containers/Treasuries/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('entities', async () => {
	const data = await getEntitiesPageData()
	return {
		props: { data, entity: true },
		revalidate: maxAgeForNext([22])
	}
})

export default function Entities(props) {
	return <Treasuries {...props} />
}
