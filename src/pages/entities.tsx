import Layout from '~/layout'
import * as React from 'react'
import { withPerformanceLogging } from '~/utils/perf'
import { getTreasuryData, TreasuriesPage } from '~/components/Treasuries'
import { treasuriesColumns } from '~/components/Table/Defi/columns'

export const getStaticProps = withPerformanceLogging('entities', getTreasuryData('https://api.llama.fi/entities'))

export default function Entities({ treasuries }) {
	return (
		<Layout title={`Entities - DefiLlama`} defaultSEO>
			<TreasuriesPage
				treasuries={treasuries}
				treasuriesColumns={treasuriesColumns.filter((c: any) => !['ownTokens', 'coreTvl'].includes(c.accessorKey))}
			/>
		</Layout>
	)
}
