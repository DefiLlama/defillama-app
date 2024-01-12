import * as React from 'react'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search'
import { maxAgeForNext } from '~/api'
import { getETFData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'

import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { ETFColumn } from '~/components/Table/Defi/columns'

export const getStaticProps = withPerformanceLogging('lsd', async () => {
	const data = await getETFData()

	return {
		props: { etf: data.props.etf },
		revalidate: maxAgeForNext([22])
	}
})

// `

const PageView = ({ etf }) => {
	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Exchange Traded Funds' }} />

			<TableWithSearch data={etf} columns={ETFColumn} columnToSearch={'ticker'} placeholder={'Search ETF...'} />
		</>
	)
}

export default function ETFs(props) {
	return (
		<Layout title={`Exchange Traded Funds - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
