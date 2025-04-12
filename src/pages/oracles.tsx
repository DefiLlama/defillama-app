import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { OraclesByChain } from '~/containers/Oracles'
import { getOraclePageData } from '~/containers/Oracles/queries'

export const getStaticProps = withPerformanceLogging('oracles', async () => {
	const data = await getOraclePageData()

	return {
		props: { ...data },
		revalidate: maxAgeForNext([22])
	}
})

export default function OraclesPage(props) {
	return <OraclesByChain {...props} />
}
