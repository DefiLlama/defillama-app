import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { InvestorContainer } from '~/containers/Raises/Investor'
import { getInvestorRaisesPageData } from '~/containers/Raises/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Deals by Investor']

export const getStaticProps = withPerformanceLogging(
	'raises/[investorName]',
	async ({ params }: GetStaticPropsContext<{ investorName: string }>) => {
		const revalidate = maxAgeForNext([22])

		if (!params?.investorName) {
			return { notFound: true, revalidate }
		}

		const data = await getInvestorRaisesPageData(params.investorName)
		if ('notFound' in data) {
			return { notFound: true, revalidate }
		}

		return { props: data, revalidate }
	}
)

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return {
		paths: [],
		fallback: 'blocking'
	}
}

const Raises = (props: InferGetStaticPropsType<typeof getStaticProps>) => {
	const investorName = props.investorName
	return (
		<Layout
			title="Raises - DefiLlama"
			description={`Track ${investorName} investments, total funding amount, and total funding rounds on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${investorName.toLowerCase()} investments, total funding amount, total funding rounds`}
			canonicalUrl={`/raises/${slug(investorName)}`}
			pageName={pageName}
		>
			<InvestorContainer {...props} />
		</Layout>
	)
}

export default Raises
