import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { ROITable } from '~/components/Table'
import { ProtocolsChainsSearch } from '~/components/Search'
import { maxAgeForNext } from '~/api'
import { getROIData } from '~/api/categories/protocols'

import type { IBarChartProps } from '~/components/ECharts/types'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export async function getStaticProps() {
	const data = await getROIData()

	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
}

const PageView = ({ priceData }) => {
	const chartData = priceData.map((p) => [p.symbol, p?.usd1d]).sort((a, b) => b[1] - a[1])

	const options = {
		xAxis: {
			type: 'category',
			data: chartData.map((i) => i[0])
		}
	}

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Price ROI' }} />

			<BarChart chartData={chartData} title="ROI" valueSymbol="%" chartOptions={options} color="#4f8fea" />

			<ROITable data={priceData} />
		</>
	)
}

export default function PriceROI(props) {
	return (
		<Layout title={`Price ROI - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
