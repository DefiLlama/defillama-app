import * as React from 'react'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { useRouter } from 'next/router'
import { useDarkModeManager } from '~/contexts/LocalStorage'

import dynamic from 'next/dynamic'
import { chainCoingeckoIds, chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { ChartTypes, SortableItem } from '../Defi/Protocol/ProtocolPro'
import { groupBy as lodahGroupBy, mapValues } from 'lodash'
import { ItemsSelect, chainChartOptions } from './ItemsSelect'
import { useCompare } from '~/containers/ComparePage'
import { SelectedItem } from './SelectedItem'
import { LocalLoader } from '~/components/LocalLoader'
import { sluggify } from '~/utils/cache-client'
import { RowFilter } from '~/components/Filters/common/RowFilter'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols/ProTable'
import useIsSubscribed from './queries/useIsSubscribed'
import { useVerified } from './hooks/useVerified'
import ProtocolChart from '~/components/ECharts/ProtocolChart/ProtocolChart'
import Subscribe from './Subscribe'

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart/index'), {
	ssr: false
})

const defaultBlocks = [
	'chain-Ethereum-fees',
	'chain-Arbitrum-txs',
	'chain-Ethereum-revenue',
	'chain-Arbitrum-revenue',
	'chain-Ethereum-table'
]

export interface ChainState {
	name: string
	charts: string[]
}

// @ts-ignore
export class SmartPointerSensor extends PointerSensor {
	static activators = [
		{
			eventName: 'onPointerDown' as any,
			// @ts-ignore
			handler: ({ nativeEvent: event }: PointerEvent) => {
				console.log(!event.isPrimary || event.button !== 0 || isInteractiveElement(event.target as Element))
				if (!event.isPrimary || event.button !== 0 || isInteractiveElement(event.target as Element)) {
					return false
				}

				return true
			}
		}
	]
}

function isInteractiveElement(element: Element | null) {
	const interactiveElements = ['button', 'input', 'textarea', 'select', 'option', 'a']
	if (element?.tagName && interactiveElements.includes(element.tagName.toLowerCase())) {
		return true
	}

	return false
}

export const getName = (itemStr) => {
	const [type, name, chartType] = itemStr.split('-')
	if (type === 'chain')
		return chartType === 'table' ? null : `${name} ` + chainChartOptions.find((opt) => opt.id === chartType)?.name
	if (type === 'protocol') return `${name} ${ChartTypes[chartType]}`
	return null
}

export function ChainContainer({ selectedChain = 'All', chainOptions, protocolsList }) {
	const [items, setItems] = useState(defaultBlocks)
	const router = useRouter()

	const isSubscribedToChain = useIsSubscribed()
	const { isVerified, setIsVerified } = useVerified()
	const { period, groupBy } = router.query
	const [protocolProps, setProtocolProps] = useState({})

	const sensors = useSensors(
		useSensor(SmartPointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates
		})
	)

	const selectedChains = items?.filter((item) => item.includes('chain-')).map((item) => item.split('-')[1])

	const { data: chainData, isLoading } = useCompare({ chains: selectedChains, extraTvlsEnabled: {} })

	const denomination = router.query?.currency ?? 'USD'

	const [darkMode] = useDarkModeManager()

	let CHAIN_SYMBOL = null
	let chainGeckoId = null

	if (selectedChain !== 'All') {
		let chainDenomination = chainCoingeckoIds[selectedChain] ?? chainCoingeckoIdsForGasNotMcap[selectedChain] ?? null

		chainGeckoId = chainDenomination?.geckoId ?? null

		if (chainGeckoId && chainDenomination.symbol) {
			CHAIN_SYMBOL = chainDenomination.symbol
		}
	}
	if (!isSubscribedToChain.data || !isVerified)
		return (
			<Subscribe
				refresh={() => {
					isSubscribedToChain.refetch()
				}}
				verify={() => setIsVerified(true)}
			/>
		)

	const renderChart = (key, i) => {
		const [type, name, chartType] = key.split('-')
		if (type === 'protocol') {
			const [, protocol, chartType] = key.split('-')
			return (
				<ProtocolChart
					{...protocolProps[sluggify(protocol)]}
					protocol={protocol}
					enabled={{ tvl: 'false', [chartType]: 'true', groupBy }}
					name={ChartTypes[chartType]}
					color={'#333'}
				/>
			)
		} else if (type === 'chain') {
			if (chartType === 'table') return <ProtocolsByChainTable chain={name} />
			const dataset = chainData?.filter(Boolean).find(({ chain }) => chain === name)
			if (!dataset) return null
			return (
				<ChainChart
					datasets={[dataset]}
					title=""
					denomination={denomination}
					isThemeDark={darkMode}
					chartType={chartType}
					isFirstChart={i === 0 || i === 1}
				/>
			)
		}
	}

	const itemsByGroups = mapValues(
		lodahGroupBy(items, (item) => item.split('-')[1]),
		(groupItems) => groupItems.map((item) => item?.split('-')[2])
	)

	const itemsByTypes = mapValues(
		lodahGroupBy(items, (item) => item.split('-')[0]),
		(groupItems) => groupItems.map((item) => item?.split('-')[1])
	)

	return (
		<>
			<ProtocolsChainsSearch
				step={{
					category: 'Home',
					name: selectedChain === 'All' ? 'All Protocols' : selectedChain
				}}
			/>
			<div className="flex flex-wrap gap-2">
				{Object.entries(itemsByGroups).map(([name, items]) => {
					return (
						<SelectedItem
							key={name}
							setItems={setItems}
							items={items}
							name={name}
							type={itemsByTypes.chain?.includes(name) ? 'chain' : 'protocol'}
						/>
					)
				})}

				<ItemsSelect chains={chainOptions} setItems={setItems} setProtocolProps={setProtocolProps} />
			</div>
			<div className="flex gap-2 mb-2">
				<RowFilter
					style={{ width: 'fit-content', height: '100%' }}
					selectedValue={period as string}
					values={['7d', '30d', '90d', '180d', '365d']}
					setValue={(val) =>
						router.push(
							{
								pathname: router.pathname,
								query: { ...router.query, period: val === period ? undefined : val }
							},
							undefined,
							{ shallow: true }
						)
					}
				/>
				<RowFilter
					style={{ width: 'fit-content', height: '100%' }}
					selectedValue={groupBy as string}
					values={['daily', 'weekly', 'monthly', 'cumulative']}
					setValue={(val) =>
						router.push(
							{
								pathname: router.pathname,
								query: { ...router.query, groupBy: val === groupBy ? undefined : val }
							},
							undefined,
							{ shallow: true }
						)
					}
				/>
			</div>
			<div className="flex flex-col p-3 gap-5 rounded-md border border-wblack/10 dark:border-white/10 bg-white dark:bg-[#090a0b] -mt-3 md:mt-0">
				{isLoading ? (
					<div className="flex items-center justify-center m-auto min-h-[360px]">
						<LocalLoader />
					</div>
				) : (
					<div
						className="w-full grid gap-3 mt-4 *:w-full *:*:w-full"
						style={{ gridTemplateColumns: `repeat(${items?.length >= 2 ? 2 : items.length}, 1fr)` }}
					>
						<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
							<SortableContext items={items} strategy={rectSortingStrategy}>
								{items.map((id, i) => (
									<SortableItem id={id} key={id + items.length} isTable={id.includes('table')}>
										<div className="rounded-cl p-2 shadow bg-[var(--bg6)]">
											<div className="font-bold text-sm mx-4 mt-1">{getName(id)}</div>
											{renderChart(id, i)}
										</div>
									</SortableItem>
								))}
							</SortableContext>
						</DndContext>
					</div>
				)}
			</div>
		</>
	)

	function handleDragEnd(event) {
		const { active, over } = event

		if (active.id !== over.id) {
			setItems((items) => {
				const oldIndex = items.indexOf(active.id)
				const newIndex = items.indexOf(over.id)

				return arrayMove(items, oldIndex, newIndex)
			})
		}
	}
}

// LayoutWrapper todo styles
// & > *:last-child {
// 	background: none;

// 	th,
// 	td {
// 		background: ${({ theme }) => (theme.mode === 'dark' ? '#090a0b' : 'white')};
// 	}

// 	th:not(:last-child),
// 	td:not(:last-child) {
// 		border-right: 1px solid ${({ theme }) => theme.divider};
// 	}

// 	border: ${({ theme }) => '1px solid ' + theme.divider};

// 	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
// 		max-width: calc(100vw - 276px - 40px);
// 	}
// }
