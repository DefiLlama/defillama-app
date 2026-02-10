// import { maxAgeForNext } from '~/api'
// import { OraclesByChain } from '~/containers/Oracles'
// import { getOraclePageData } from '~/containers/Oracles/queries'
// import { withPerformanceLogging } from '~/utils/perf'

// export const getStaticProps = withPerformanceLogging('oracles', async () => {
// 	const data = await getOraclePageData()

// 	return {
// 		props: { ...data },
// 		revalidate: maxAgeForNext([22])
// 	}
// })

// export default function OraclesPage(props) {
// 	return <OraclesByChain {...props} />
// }

import { BasicLink } from '~/components/Link'
import { TemporarilyDisabledPage } from '~/components/TemporarilyDisabledPage'

export default function OraclesPage() {
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
