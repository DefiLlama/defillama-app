import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { InvestorContainer } from '~/containers/Raises/Investor'
import { getInvestorRaisesPageData } from '~/containers/Raises/queries'
import { withPerformanceLogging } from '~/utils/perf'

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
	return {
		paths: [],
		fallback: 'blocking'
	}
}

const Raises = (props: InferGetStaticPropsType<typeof getStaticProps>) => {
	return <InvestorContainer {...props} />
}

export default Raises
