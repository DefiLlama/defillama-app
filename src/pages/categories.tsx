import { maxAgeForNext } from '~/api'
import { ProtocolsCategoriesPage } from '~/containers/ProtocolsByCategoryOrTag/CategoriesPage'
import { getProtocolsCategoriesPageData } from '~/containers/ProtocolsByCategoryOrTag/queries'
import type { IProtocolsCategoriesPageData } from '~/containers/ProtocolsByCategoryOrTag/types'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('categories', async () => {
	const pageData = await getProtocolsCategoriesPageData()

	return {
		props: pageData,
		revalidate: maxAgeForNext([22])
	}
})

export default function CategoriesPage(props: IProtocolsCategoriesPageData) {
	return <ProtocolsCategoriesPage {...props} />
}
