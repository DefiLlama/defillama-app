import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getOraclePageData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import Oracles from '~/components/Oracles'

// @ts-ignore TODO: same reason as in another file, getOraclePageData cares too much
export const getStaticProps = withPerformanceLogging('oracles', async () => {
	const data = await getOraclePageData()

	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
})

export default function OraclesPage(props) {
	return (
		<Layout title={`Oracles - DefiLlama`} defaultSEO>
			<Oracles {...props} />
		</Layout>
	)
}
