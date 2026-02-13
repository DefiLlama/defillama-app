import { maxAgeForNext } from '~/api'
import RaisesContainer from '~/containers/Raises'
import { getRaisesPageData } from '~/containers/Raises/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('raises', async () => {
	const data = await getRaisesPageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const Raises = (props) => {
	return <RaisesContainer {...props} />
}

export default Raises
