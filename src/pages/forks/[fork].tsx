import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { ForksByProtocol } from '~/containers/Forks/ForksByProtocol'
import { getForksByProtocolPageData } from '~/containers/Forks/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Forks']

export const getStaticProps = withPerformanceLogging('forks/[fork]', async ({ params }) => {
	if (!params?.fork) {
		return { notFound: true }
	}

	const forkParam = Array.isArray(params.fork) ? params.fork[0] : params.fork
	const data = await getForksByProtocolPageData({ fork: forkParam })

	if (!data) {
		return { notFound: true }
	}

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

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

	return { paths: [], fallback: 'blocking' }
}

export default function ForkPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const { fork } = props

	return (
		<Layout
			title={`${fork ?? 'Forks'} - DefiLlama`}
			description={`Protocols rankings by their forks value. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`forks by protocol, protocol forks, forks on blockchain`}
			canonicalUrl={fork ? `/forks/${slug(fork)}` : '/forks'}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<ForksByProtocol {...props} />
		</Layout>
	)
}
