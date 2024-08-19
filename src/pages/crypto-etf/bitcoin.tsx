import * as React from 'react'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'
import { getETFData } from '~/api/categories/protocols'

import { ETFContainer } from '~/containers/etfContainer'

export const getStaticProps = withPerformanceLogging('crypto-etf/bitcoin', async () => {
	const data = await getETFData('bitcoin')

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
