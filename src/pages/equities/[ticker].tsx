import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { getEquitiesTickerPageData } from '~/containers/Equities/queries'
import { EquityTickerPage } from '~/containers/Equities/TickerPage'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'equities/[ticker]',
	async ({ params }: GetStaticPropsContext<{ ticker: string }>) => {
		if (!params?.ticker) {
			return { notFound: true }
		}

		const props = await getEquitiesTickerPageData(params.ticker)

		if (!props) {
			return { notFound: true }
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

	// const tickers = await getEquitiesTickerPaths()
	return {
		paths: [],
		fallback: 'blocking'
	}
}

export default function EquityTickerDetailPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.name} (${props.ticker}) Stock Overview - DefiLlama`}
			description={`Track ${props.name} (${props.ticker}) price history, financial statements, key metrics, and SEC filings on DefiLlama.`}
			canonicalUrl={`/equities/${props.ticker.toLowerCase()}`}
		>
			<EquityTickerPage {...props} />
		</Layout>
	)
}
