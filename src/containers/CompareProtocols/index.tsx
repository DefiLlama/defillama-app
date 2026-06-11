import { useQueries } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import * as React from 'react'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { MultiSelectCombobox } from '~/components/Select/MultiSelectCombobox'
import { applyProtocolTvlSettings } from '~/containers/ProtocolLists/utils'
import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import { ChainProtocolsTable } from '~/containers/ProtocolRankings/Table'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { slug } from '~/utils'
import { parseNumberQueryParam, pushShallowQuery } from '~/utils/routerQuery'
import type { RawProtocolResponse } from './api.types'
import { buildCompareProtocolsChartData } from './chartData'
import type { CompareProtocolsProps } from './types'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

export function CompareProtocols({ protocols, protocolsList }: CompareProtocolsProps) {
	const router = useRouter()

	const [extraTvlEnabled] = useLocalStorageSettingsManager('tvl')

	const { protocol: protocolQuery } = router.query

	const selectedProtocols = React.useMemo(() => {
		return protocolQuery ? (typeof protocolQuery === 'string' ? [protocolQuery] : [...protocolQuery]) : []
	}, [protocolQuery])

	const results = useQueries({
		queries: selectedProtocols.map((protocol) => ({
			queryKey: ['compare-protocols', protocol],
			queryFn: async () => {
				const protocolData = await fetchProtocolBySlug<RawProtocolResponse>(slug(protocol))
				return { protocolData }
			},
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0
		}))
	})

	const isLoading = results.some((r) => r.isLoading)

	const minTvl = parseNumberQueryParam(router.query.minTvl)
	const maxTvl = parseNumberQueryParam(router.query.maxTvl)

	const { dataset, charts } = React.useMemo(() => {
		const protocolResponses: RawProtocolResponse[] = []
		for (const result of results) {
			if (result.data?.protocolData) {
				protocolResponses.push(result.data.protocolData)
			}
		}
		return buildCompareProtocolsChartData({ protocolResponses, extraTvlEnabled })
	}, [results, extraTvlEnabled])

	const { selectedProtocolsData, selectedProtocolsNames } = React.useMemo(() => {
		const selectedProtocolsData = selectedProtocols.reduce<typeof protocols>((acc, protocolName) => {
			const data = protocols.find(
				(p) => p.name === protocolName || p.childProtocols?.find((cp) => cp.name === protocolName)
			)
			if (!data) return acc
			if (data.name === protocolName) {
				acc.push(data)
			} else {
				const child = data.childProtocols?.find((cp) => cp.name === protocolName)
				if (child) {
					acc.push(child)
				}
			}
			return acc
		}, [])
		return { selectedProtocolsData, selectedProtocolsNames: selectedProtocolsData.map((p) => p.name) }
	}, [selectedProtocols, protocols])

	const protocolsTableData = React.useMemo(() => {
		return applyProtocolTvlSettings({
			protocols: selectedProtocolsData,
			extraTvlsEnabled: extraTvlEnabled,
			minTvl,
			maxTvl
		})
	}, [selectedProtocolsData, extraTvlEnabled, minTvl, maxTvl])

	return (
		<>
			<div className="flex items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<MultiSelectCombobox
					data={protocolsList}
					placeholder="Select Protocols..."
					selectedValues={selectedProtocolsNames}
					setSelectedValues={(values) => {
						void pushShallowQuery(router, { protocol: values.length > 0 ? values : undefined })
					}}
				/>
			</div>
			{selectedProtocols.length > 1 ? (
				<div className="relative flex flex-col gap-2">
					<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
						{isLoading || !router.isReady ? (
							<div className="flex h-full min-h-[398px] w-full items-center justify-center">
								<LocalLoader />
							</div>
						) : (
							<React.Suspense fallback={<div className="min-h-[398px]" />}>
								<MultiSeriesChart2
									dataset={dataset}
									charts={charts}
									valueSymbol="$"
									showTotalInTooltip
									exportButtons="auto"
								/>
							</React.Suspense>
						)}
					</div>

					{protocolsTableData.length > 0 ? (
						<div>
							<ChainProtocolsTable protocols={protocolsTableData} useStickyHeader={false} />
						</div>
					) : null}
				</div>
			) : (
				<div className="flex min-h-[362px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<p className="text-sm text-(--text-secondary)">Select at least 2 protocols to compare</p>
				</div>
			)}
		</>
	)
}
