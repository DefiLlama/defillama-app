import type { InferGetStaticPropsType } from 'next'
import RaisesContainer from '~/containers/Raises'
import { getRaisesPageData } from '~/containers/Raises/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Raises Overview']

export const getStaticProps = withPerformanceLogging('raises', async () => {
	const data = await getRaisesPageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const Raises = (props: InferGetStaticPropsType<typeof getStaticProps>) => {
	return (
		<Layout
			title="Raises - DefiLlama"
			description="Track recent raises, total funding amount, and total funding rounds on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="recent raises, total funding amount, total funding rounds"
			canonicalUrl="/raises"
			pageName={pageName}
		>
			<RaisesContainer {...props} />
		</Layout>
	)
}

export default Raises
