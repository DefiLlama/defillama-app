import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { DATCompany } from '~/containers/DAT/Company'
import { getDATCompanyData } from '~/containers/DAT/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'digital-asset-treasury/[company]',
	async ({ params }: GetStaticPropsContext<{ company: string }>) => {
		if (!params?.company) {
			return { notFound: true, revalidate: maxAgeForNext([22]) }
		}

		const company = slug(params.company)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		if (!metadataCache.digitalAssetTreasuryCompanySlugsSet.has(company)) {
			return { notFound: true, revalidate: maxAgeForNext([22]) }
		}

		const props = await getDATCompanyData(company)

		if (!props) {
			return { notFound: true, revalidate: maxAgeForNext([22]) }
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

	const { getDATCompanyStaticPaths } = await import('~/server/routeCache/assets')
	const paths = await getDATCompanyStaticPaths()
	return { paths, fallback: false }
}

export default function DigitalAssetTreasuryPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.name} Digital Asset Treasury - DefiLlama`}
			description={`Track ${props.name}'s live digital asset treasury holdings, cost basis, average purchase price, mNAV, share price and acquisition timeline.`}
			canonicalUrl={`/digital-asset-treasury/${slug(props.ticker)}`}
		>
			<DATCompany {...props} />
		</Layout>
	)
}
