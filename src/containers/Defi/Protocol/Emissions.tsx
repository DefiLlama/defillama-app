import dynamic from 'next/dynamic'
import type { IChartProps } from '~/components/ECharts/types'
import { Section } from '~/layout/ProtocolAndPool'

export interface IEmission {
	label: string
	data: Array<{ timestamp: number; unlocked: number }>
}

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export function Emissions({
	data,
	categories,
	isEmissionsPage
}: {
	data: Array<IEmission>
	categories: Array<string>
	isEmissionsPage?: boolean
}) {
	return (
		<Section id="emissions">
			{!isEmissionsPage && <h3>Emissions</h3>}
			<span style={{ minHeight: '360px' }}>
				<AreaChart title="" stacks={categories} chartData={data} hidedefaultlegend />
			</span>
		</Section>
	)
}
