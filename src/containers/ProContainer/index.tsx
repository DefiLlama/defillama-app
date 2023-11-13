import * as React from 'react'
import styled from 'styled-components'
import { ProtocolsChainsSearch } from '~/components/Search'
import { useRouter } from 'next/router'
import { useDarkModeManager, useDefiManager } from '~/contexts/LocalStorage'
import { useGetProtocolsList } from '~/api/categories/protocols/client'

import dynamic from 'next/dynamic'
import { chainCoingeckoIds, chainCoingeckoIdsForGasNotMcap } from '~/constants/chainTokens'
import { DetailsWrapper } from '~/layout/ProtocolAndPool'

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { ChartTypes, SortableItem } from '../Defi/Protocol/PorotcolPro'
import { groupBy, mapValues } from 'lodash'
import ProtocolChart from '~/components/ECharts/ProtocolDNDChart/ProtocolChart'
import ItemsSelect, { chainChartOptions, FilterHeader } from './ItemsSelect'
import { useCompare } from '~/components/ComparePage'
import SelectedItem from './SelectedItem'
import LocalLoader from '~/components/LocalLoader'
import { sluggify } from '~/utils/cache-client'
import RowFilter from '~/components/Filters/common/RowFilter'

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

const ChainChart: any = dynamic(() => import('~/components/ECharts/ChainChart/ProChart'), {
	ssr: false
})

const Game: any = dynamic(() => import('~/game'))

export const StatsSection = styled.div`
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	box-shadow: ${({ theme }) => theme.shadowSm};
	position: relative;
	isolation: isolate;
	height: 100%;
`

export const ChartBody = styled.div`
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	box-shadow: ${({ theme }) => theme.shadowSm};
	padding-top: 8px;
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
	'chain-BSC-fees'
]

export interface ChainState {
	name: string
	charts: string[]
}

export const getName = (itemStr) => {
	const [type, name, chartType] = itemStr.split('-')
	if (type === 'chain') return `${name} ` + chainChartOptions.find((opt) => opt.id === chartType)?.name
	return `${name} ${ChartTypes[chartType]}`
}

export function ChainContainer({ selectedChain = 'All', chainOptions, protocolsList }) {
	const [items, setItems] = useState(defaultBlocks)
	const router = useRouter()

	const { period } = router.query
	const [protocolProps, setProtocolProps] = useState({})

	const sensors = useSensors(
		useSensor(PointerSensor),
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

	const renderChart = (key, i) => {
		const [type, name, chartType] = key.split('-')
		if (type === 'protocol') {
			const [, protocol, chartType] = key.split('-')
			console.log(protocol, chartType)
			return (
				<ProtocolChart
					{...protocolProps[sluggify(protocol)]}
					protocol={protocol}
					enabled={{ tvl: 'false', [chartType]: 'true' }}
					name={ChartTypes[chartType]}
					color={'#333'}
				/>
			)
		} else {
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
		groupBy(items, (item) => item.split('-')[1]),
		(groupItems) => groupItems.map((item) => item?.split('-')[2])
	)

	const itemsByTypes = mapValues(
		groupBy(items, (item) => item.split('-')[0]),
		(groupItems) => groupItems.map((item) => item?.split('-')[1])
	)
	console.log(protocolProps)
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
			<LayoutWrapper>
				<RowFilter
					style={{ width: 'fit-content', marginBottom: '-8px' }}
					selectedValue={period as string}
					values={['7d', '30d', '180d']}
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
				{isLoading ? (
					<LocalLoader />
				) : (
					<ChartsBody itemsCount={items?.length}>
						<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
							<SortableContext items={items} strategy={rectSortingStrategy}>
								{items.map((id, i) => (
									<SortableItem id={id} key={id + items.length}>
										<ChartBody>
											<FilterHeader>{getName(id)}</FilterHeader>
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

export const ChainsSelect = styled.nav`
	display: flex;
`

export const ChartWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px 0;
	grid-column: span 1;
	min-height: 442px;
`

export const ToggleWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
`

export const OverallMetricsWrapper = styled(DetailsWrapper)`
	background: none;
	gap: 8px;

	& > *[data-chainname] {
		margin-bottom: 16px;
	}

	& > *[data-tvl] {
		margin-bottom: 8px;
	}
`
