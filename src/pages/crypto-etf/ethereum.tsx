import * as React from 'react'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'
import { getETFData } from '~/api/categories/protocols'

import { ETFContainer } from '~/containers/ETF'

export const getStaticProps = withPerformanceLogging('crypto-etf/ethereum', async () => {
	const data = await getETFData('ethereum')

	return {
		props: { ...data.props },
		revalidate: 5 * 60
	}
})

export default function ETFs(props) {
	return (
		<Layout title={`Exchange Traded Funds - DefiLlama`} defaultSEO>
			<ETFContainer {...props} />
		</Layout>
	)
}
