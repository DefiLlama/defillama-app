import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useMemo } from 'react'
import type { IPieChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { getProtocolEmissionsPieData } from '~/containers/Unlocks/queries'
import { slug } from '~/utils'
import { download } from '~/utils/download'
import type { UnlocksPieConfig } from '../types'
import { ProTableCSVButton } from './ProTable/CsvButton'

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const LOCKED_UNLOCKED_COLORS = {
	Unlocked: '#0c5dff',
	Locked: '#ff4e21'
}

const EMPTY_PIE_DATA: Array<{ name: string; value: number }> = []

interface UnlocksPieCardProps {
	config: UnlocksPieConfig
}

export function UnlocksPieCard({ config }: UnlocksPieCardProps) {
	const { protocol, protocolName, chartType } = config

	const { data, isLoading } = useQuery({
		queryKey: ['pro-dashboard', 'unlocks-pie', protocol],
		queryFn: () => getProtocolEmissionsPieData(slug(protocol)),
		enabled: Boolean(protocol),
		staleTime: 60 * 60 * 1000
	})

	const allocationPieChartData = useMemo(() => {
		const pieData = data?.pieChartData?.documented ?? EMPTY_PIE_DATA
		return pieData
			.map((item: any) => ({ name: item?.name, value: Number(item?.value) }))
			.filter((item: any) => item.name && Number.isFinite(item.value) && item.value > 0)
	}, [data])

	const allocationColors = useMemo(() => data?.stackColors?.documented ?? {}, [data])

	const unlockedPercent = useMemo(() => {
		const totalLocked = data?.meta?.totalLocked
		const maxSupply = data?.meta?.maxSupply
		if (totalLocked == null || maxSupply == null) return null
		const totalLockedValue = Number(totalLocked)
		const maxSupplyValue = Number(maxSupply)
		if (!Number.isFinite(totalLockedValue) || !Number.isFinite(maxSupplyValue) || maxSupplyValue === 0) return null
		const percent = 100 - (totalLockedValue / maxSupplyValue) * 100
		return Math.min(100, Math.max(0, percent))
	}, [data])

	const lockedUnlockedPieChartData = useMemo(
		() =>
			unlockedPercent == null
				? EMPTY_PIE_DATA
				: [
						{ name: 'Unlocked', value: unlockedPercent },
						{ name: 'Locked', value: 100 - unlockedPercent }
					],
		[unlockedPercent]
	)

	const chartData = chartType === 'allocation' ? allocationPieChartData : lockedUnlockedPieChartData
	const stackColors = chartType === 'allocation' ? allocationColors : LOCKED_UNLOCKED_COLORS
	const chartTitle = chartType === 'allocation' ? 'Allocation' : 'Locked/Unlocked %'
	const valueSymbol = chartType === 'locked-unlocked' ? '%' : '$'
	const hasChartData = chartData.length > 0
	const csvFileName = `${protocolName || protocol}-unlocks-${chartType}`

	const handleCsvExport = useCallback(() => {
		if (!hasChartData) return
		const rows = [['Category', 'Value'], ...chartData.map((item) => [item.name, String(item.value)])]
		const csvContent = rows.map((row) => row.join(',')).join('\n')
		download(csvFileName, csvContent)
	}, [chartData, csvFileName, hasChartData])

	if (isLoading) {
		return (
			<div className="flex h-full min-h-[360px] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col p-2">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h3 className="text-sm font-semibold pro-text1">{chartTitle}</h3>
					<p className="text-xs pro-text2">{protocolName}</p>
				</div>
				{hasChartData && (
					<div className="flex gap-2">
						<ProTableCSVButton
							onClick={handleCsvExport}
							smol
							className="flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue disabled:border-(--cards-border) disabled:text-(--text-disabled)"
						/>
					</div>
				)}
			</div>
			<div className="flex-1">
				{hasChartData ? (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<PieChart chartData={chartData} stackColors={stackColors} valueSymbol={valueSymbol} />
					</Suspense>
				) : (
					<div className="flex h-[320px] items-center justify-center text-center pro-text3">No unlocks data.</div>
				)}
			</div>
		</div>
	)
}
