import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { DATCompany } from '~/containers/DAT/Company'
import { getDATCompanyData, getDATCompanyPaths } from '~/containers/DAT/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'digital-asset-treasury/[company]',
	async ({ params }: GetStaticPropsContext<{ company: string }>) => {
		if (!params?.company) {
			return { notFound: true, props: null }
		}

		const props = await getDATCompanyData(params.company)

		if (!props) {
			return { notFound: true, props: null }
		}

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const slugs = await getDATCompanyPaths()
	const paths = slugs.map((company) => ({ params: { company } }))
	return { paths, fallback: false }
}

export default function DigitalAssetTreasuryPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.name} Digital Asset Treasury - DefiLlama`}
			description={`Track ${props.name}'s digital asset treasury holdings. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${props.name} digital asset treasury holdings, ${props.name} DATs`}
			canonicalUrl={`/digital-asset-treasury/${slug(props.ticker)}`}
		>
			<DATCompany {...props} />
		</Layout>
	)
}
