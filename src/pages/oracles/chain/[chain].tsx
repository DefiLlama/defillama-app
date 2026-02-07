// import * as React from 'react'
// import { maxAgeForNext } from '~/api'
// import { OraclesByChain } from '~/containers/Oracles'
// import { getOraclePageData, getOraclePageDataByChain } from '~/containers/Oracles/queries'
// import { withPerformanceLogging } from '~/utils/perf'

// export const getStaticProps = withPerformanceLogging('oracles/[chain]', async ({ params: { chain } }) => {
// 	const data = await getOraclePageDataByChain(chain as string)

// 	if (!data) {
// 		return { notFound: true }
// 	}

// 	return {
// 		props: { ...data },
// 		revalidate: maxAgeForNext([22])
// 	}
// })

// export async function getStaticPaths() {
// 	const data = await getOraclePageData()

// 	const chainsByOracle = data?.chainsByOracle ?? {}

// 	const chainsLits = [...new Set(Object.values(chainsByOracle).flat())]

// 	const paths = chainsLits.slice(0, 10).map((chain) => {
// 		return {
// 			params: { chain }
// 		}
// 	})

// 	return { paths, fallback: 'blocking' }
// }

// export default function OraclesPage(props) {
// 	return <OraclesByChain {...props} />
// }

import { BasicLink } from '~/components/Link'
import { TemporarilyDisabledPage } from '~/components/TemporarilyDisabledPage'

export default function OraclesChainPage() {
	return (
		<TemporarilyDisabledPage
			title="Oracles temporarily disabled - DefiLlama"
			description="Oracles dashboards are temporarily disabled and will be back shortly."
			canonicalUrl="/oracles"
		>
			<p>The Oracles dashboards are temporarily disabled while we perform maintenance. We&apos;ll be back shortly.</p>
			<p>
				In the meantime, check out{' '}
				<BasicLink href="/metrics" className="underline">
					other dashboards
				</BasicLink>
				.
			</p>
		</TemporarilyDisabledPage>
	)
}
