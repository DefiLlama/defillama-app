import Layout from '~/layout'
import { PROTOCOLS_TREASURY } from '~/constants'
import * as React from 'react'
import { withPerformanceLogging } from '~/utils/perf'
import { getTreasuryData, TreasuriesPage } from '~/components/Treasuries'
import { treasuriesColumns } from '~/components/Table/Defi/columns'

export const getStaticProps = withPerformanceLogging('treasuries', getTreasuryData(PROTOCOLS_TREASURY))

export default function Treasuries({ treasuries }) {
	return (
		<Layout title={`Treasuries - DefiLlama`} defaultSEO>
			<TreasuriesPage treasuries={treasuries} treasuriesColumns={treasuriesColumns} />
		</Layout>
	)
}
