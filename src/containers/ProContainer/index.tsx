import * as React from 'react'
import styled from 'styled-components'
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
import ItemsSelect, { chainChartOptions, FilterHeader } from './ItemsSelect'
import { useCompare } from '~/containers/ComparePage'
import SelectedItem from './SelectedItem'
import { LocalLoader } from '~/components/LocalLoader'
import { sluggify } from '~/utils/cache-client'
import { RowFilter } from '~/components/Filters/common/RowFilter'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols/ProTable'
import useIsSubscribed from './queries/useIsSubscribed'
import { useVerified } from './hooks/useVerified'
import ProtocolChart from '~/components/ECharts/ProtocolChart/ProtocolChart'
import Subscribe from './Subscribe'

const ChartsBody = styled.div<{ itemsCount }>`
	width: 100%;
	display: grid;
	grid-template-columns: ${({ itemsCount }) => `repeat(${itemsCount >= 2 ? 2 : itemsCount}, 1fr)`};
	grid-gap: 10px;
	margin-top: 16px;
	& > div {
		height: 100%;
	}
	& > div > div {
		height: 100%;
	}
`

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart/index'), {
	ssr: false
})

export const ChartBody = styled.div`
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	box-shadow: ${({ theme }) => theme.shadowSm};
	padding-top: 8px;
	padding: 8px;
`

export const Filters = styled.div`
	display: flex;
	gap: 8px;
	margin-bottom: 8px;
`

export const SelectedItems = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
`

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
			<SelectedItems>
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
			</SelectedItems>
			<Filters>
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
			</Filters>
			<LayoutWrapper>
				{isLoading ? (
					<div className="flex items-center justify-center m-auto min-h-[360px]">
						<LocalLoader />
					</div>
				) : (
					<ChartsBody itemsCount={items?.length}>
						<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
							<SortableContext items={items} strategy={rectSortingStrategy}>
								{items.map((id, i) => (
									<SortableItem id={id} key={id + items.length} isTable={id.includes('table')}>
										<ChartBody>
											<FilterHeader style={{ fontWeight: 'bold' }}>{getName(id)}</FilterHeader>
											{renderChart(id, i)}
										</ChartBody>
									</SortableItem>
								))}
							</SortableContext>
						</DndContext>
					</ChartsBody>
				)}{' '}
			</LayoutWrapper>
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

export const LayoutWrapper = styled.div`
	display: flex;
	flex-direction: column;
	padding: 12px;
	gap: 20px;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? '#090a0b' : 'white')};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	border-radius: 12px;
	box-shadow: ${({ theme }) => theme.shadowSm};

	& > *:last-child {
		background: none;

		th,
		td {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#090a0b' : 'white')};
		}

		th:not(:last-child),
		td:not(:last-child) {
			border-right: 1px solid ${({ theme }) => theme.divider};
		}

		border: ${({ theme }) => '1px solid ' + theme.divider};

		@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
			max-width: calc(100vw - 276px - 40px);
		}
	}

	@media (max-width: ${({ theme }) => theme.bpMed}) {
		margin: -12px;
	}
`

export const ChartWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px 0;
	grid-column: span 1;
	min-height: 442px;
`
