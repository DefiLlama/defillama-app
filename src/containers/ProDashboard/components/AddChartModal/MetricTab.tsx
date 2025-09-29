import { useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { useAppMetadata } from '../../AppMetadataContext'
import { useProDashboard } from '../../ProDashboardAPIContext'
import type { Chain, MetricAggregator, Protocol } from '../../types'
import { CHART_TYPES } from '../../types'
import { MetricCard } from '../MetricCard'
import { MetricSentenceBuilder } from './MetricSentenceBuilder'

type MetricTabProps = {
	metricSubjectType: 'chain' | 'protocol'
	metricChain: string | null
	metricProtocol: string | null
	metricType: string
	metricAggregator: MetricAggregator
	metricWindow: '7d' | '30d' | '90d' | '365d' | 'ytd' | '3y' | 'all'
	metricLabel: string
	metricShowSparkline: boolean
	onSubjectTypeChange: (t: 'chain' | 'protocol') => void
	onChainChange: (opt: { value: string; label: string }) => void
	onProtocolChange: (opt: { value: string; label: string }) => void
	onTypeChange: (t: string) => void
	onAggregatorChange: (a: MetricAggregator) => void
	onWindowChange: (w: '7d' | '30d' | '90d' | '365d' | 'ytd' | '3y' | 'all') => void
	onLabelChange: (s: string) => void
	onShowSparklineChange: (v: boolean) => void
}

export function MetricTab(props: MetricTabProps) {
	const {
		metricSubjectType,
		metricChain,
		metricProtocol,
		metricType,
		metricAggregator,
		metricWindow,
		metricLabel,
		metricShowSparkline,
		onSubjectTypeChange,
		onChainChange,
		onProtocolChange,
		onTypeChange,
		onAggregatorChange,
		onWindowChange,
		onLabelChange,
		onShowSparklineChange
	} = props

	const { protocols, chains, protocolsLoading } = useProDashboard()
	const protocolList = protocols as Protocol[]
	const chainList = chains as Chain[]
	const { availableProtocolChartTypes, availableChainChartTypes } = useAppMetadata()

	const availableTypes = useMemo(() => {
		if (metricSubjectType === 'protocol' && metricProtocol) {
			const geckoId = protocolList.find((p) => p.slug === metricProtocol)?.geckoId
			return availableProtocolChartTypes(metricProtocol, { hasGeckoId: !!geckoId })
		}
		if (metricSubjectType === 'chain' && metricChain) {
			const geckoId = chainList.find((c) => c.name === metricChain)?.gecko_id
			return availableChainChartTypes(metricChain, { hasGeckoId: !!geckoId })
		}
		return []
	}, [
		metricSubjectType,
		metricProtocol,
		metricChain,
		protocolList,
		chainList,
		availableProtocolChartTypes,
		availableChainChartTypes
	])

	const selectedSubject = useMemo(() => {
		if (metricSubjectType === 'protocol' && metricProtocol) {
			const geckoId = protocolList.find((p) => p.slug === metricProtocol)?.geckoId
			return {
				itemType: 'protocol' as const,
				protocol: metricProtocol,
				geckoId
			}
		}
		if (metricSubjectType === 'chain' && metricChain) {
			const geckoId = chainList.find((c) => c.name === metricChain)?.gecko_id
			return { itemType: 'chain' as const, chain: metricChain, geckoId }
		}
		return null
	}, [metricSubjectType, metricProtocol, metricChain, protocolList, chainList])

	return (
		<div className="flex h-full min-h-[360px] gap-3 overflow-hidden">
			<div className="pro-border flex w-[380px] flex-col overflow-hidden border lg:w-[420px]">
				<div className="flex h-full min-h-0 flex-col gap-4 p-3">
					<div className="rounded-xl border border-(--cards-border) bg-(--cards-bg) p-4 shadow-sm">
						<div className="flex items-start justify-between gap-3">
							<div>
								<div className="text-sm font-semibold text-(--text-primary)">Custom metric title</div>
								<div className="text-xs text-(--text-tertiary)">
									Shown above the metric tile across your dashboards.
								</div>
							</div>
							<div className="hidden h-9 w-9 items-center justify-center rounded-full bg-(--primary)/12 text-(--primary) sm:flex">
								<Icon name="pencil" width={16} height={16} />
							</div>
						</div>
						<div className="mt-3 space-y-2">
							<input
								type="text"
								value={metricLabel}
								onChange={(e) => onLabelChange(e.target.value)}
								placeholder="e.g Arbitrum Fees (30d, Avg)"
								className="w-full rounded-lg border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:ring-2 focus:ring-(--primary)/40 focus:outline-hidden"
								maxLength={64}
							/>
							<div className="flex items-center justify-between text-[11px] text-(--text-tertiary)">
								<span>Leave blank to use the automatic title.</span>
								<span>{metricLabel.length}/64</span>
							</div>
						</div>
					</div>

					<MetricSentenceBuilder
						aggregator={metricAggregator}
						metricType={metricType}
						metricSubjectType={metricSubjectType}
						metricChain={metricChain}
						metricProtocol={metricProtocol}
						metricWindow={metricWindow}
						showSparkline={metricShowSparkline}
						availableMetricTypes={availableTypes}
						chains={chainList}
						protocols={protocolList}
						onAggregatorChange={onAggregatorChange}
						onMetricTypeChange={onTypeChange}
						onSubjectTypeChange={onSubjectTypeChange}
						onChainChange={onChainChange}
						onProtocolChange={onProtocolChange}
						onWindowChange={onWindowChange}
						onShowSparklineChange={onShowSparklineChange}
					/>
				</div>
			</div>

			<div className="pro-border flex flex-1 flex-col overflow-hidden border">
				<div className="min-h-0 flex-1 overflow-hidden rounded-md bg-(--cards-bg) p-2">
					{selectedSubject && metricType ? (
						<MetricCard
							metric={{
								id: 'metric-preview',
								kind: 'metric',
								subject: selectedSubject as any,
								type: metricType,
								aggregator: metricAggregator,
								window: metricWindow,
								compare: { mode: 'previous_value', format: 'percent' },
								showSparkline: metricShowSparkline,
								label: metricLabel
							}}
						/>
					) : (
						<div className="pro-text3 flex h-full items-center justify-center text-xs">
							<div>
								<Icon name="activity" height={32} width={32} className="mx-auto mb-1" />
								Select subject and metric to preview
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
