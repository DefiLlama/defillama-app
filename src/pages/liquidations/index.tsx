/* eslint-disable no-unused-vars*/
// eslint sucks at types
import { NextPage, GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { PlusCircle } from 'react-feather'
import * as echarts from 'echarts'
import useSWR from 'swr'
import { fetcher, arrayFetcher, retrySWR } from '~/utils/useSWR'
import { Select as AriaSelect, SelectItem, SelectPopover, useSelectState } from 'ariakit/select'

import { ButtonDark } from '~/components/ButtonStyled'
import Layout from '~/layout'
// import { revalidate } from '~/api'

// import { liqs } from '../../components/LiquidationsPage'
import { Header } from '~/Theme'
import { ProtocolsChainsSearch } from '~/components/Search'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { ChartData, ChartDataBin } from '~/utils/liquidations'
import {
	BreakpointPanel,
	BreakpointPanelNoBorder,
	BreakpointPanels,
	ChartAndValuesWrapper,
	DownloadButton,
	DownloadIcon,
	PanelHiddenMobile,
	Checkbox
} from '~/components'
import { ProtocolName, Symbol } from '~/containers/ProtocolContainer'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { RowBetween } from '~/components/Row'
import { FilterButton, FilterPopover } from '~/components/Select/AriakitSelect'
import { MenuButtonArrow } from 'ariakit'
import { Stats, Item } from '~/components/Filters/shared'
import HeadHelp from '~/components/HeadHelp'
// import { ResponsiveContainer } from 'recharts'

type Chart = {
	asset: string // TODO: symbol for now, later change to coingeckoId
	aggregateBy: 'chain' | 'protocol'
	filter: FilterChain | FilterProtocol
}

// this should be pulled dynamically
type FilterChain = 'all' | string[] | 'none'
type FilterProtocol = 'all' | string[] | 'none'

const defaultChart: Chart = {
	asset: 'ETH',
	aggregateBy: 'protocol',
	filter: 'all'
}

const LiquidationsPage: NextPage = () => {
	const router = useRouter()
	const { asset, aggregateBy, filter } = router.query as Chart
	const _asset = asset || defaultChart.asset
	const _aggregateBy = aggregateBy || defaultChart.aggregateBy
	const _filter = filter || defaultChart.filter
	const chart: Chart = { asset: _asset, aggregateBy: _aggregateBy, filter: _filter }

	const { data } = useSWR<ChartData>(
		// TODO: implement the full api
		`http://localhost:3000/api/mock-liquidations/?symbol=${_asset}&aggregateBy=${_aggregateBy}${
			_filter === 'all' ? '' : _filter.map((f) => `&filter=${f}`).join('')
		}`,
		fetcher
	)

	return (
		<Layout title={`Liquidation Levels - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch
				step={{ category: 'Home', name: 'Liquidation Levels', hideOptions: true, hideSearch: true }}
			/>

			<Header>Liquidation Levels in DeFi 💦</Header>
			{data && (
				<LiquidationsContainer
					chart={chart}
					chartData={data}
					uid={`liquidations-chart-${defaultChart.asset}`}
					aggregateBy={_aggregateBy}
				/>
			)}
		</Layout>
	)
}

const LiquidationsHeaderWrapper = styled.div`
	flex: 1;
	isolation: isolate;
	z-index: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 10px;
	position: relative;
	margin-top: 1rem;

	@media (min-width: 80rem) {
		flex-direction: row;
	}
`

const Dropdowns = styled.span`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;

	button {
		font-weight: 400;
	}
`

export type DropdownOption = {
	name: string
	key: string
	enabled?: boolean
}

const ProtocolsDropdown = ({ options }: { options: DropdownOption[] }) => {
	return <h3>Protocols filter</h3>
}

const ChainsDropdown = ({ options }: { options: DropdownOption[] }) => {
	return <h3>Chains filter</h3>
}

const LiquidationsChartFilters = ({ aggregateBy }: { aggregateBy: 'chain' | 'protocol' }) => {
	const { data } = useSWR<DropdownOption[]>(
		`http://localhost:3000/api/mock-liquidations-options?aggregateBy${aggregateBy}`,
		fetcher
	)
	return (
		<Dropdowns>
			{data && (aggregateBy === 'protocol' ? <ProtocolsDropdown options={data} /> : <ChainsDropdown options={data} />)}
		</Dropdowns>
	)
}

const LiquidationsContainer = ({
	chart,
	chartData,
	uid,
	aggregateBy
}: {
	chart: Chart
	chartData: ChartData
	uid: string
	aggregateBy: 'chain' | 'protocol'
}) => {
	return (
		<>
			<LiquidationsHeaderWrapper>
				<ProtocolName>
					<TokenLogo logo={chartData.coingeckoAsset.thumb} size={24} />
					<FormattedName text={chartData.coingeckoAsset.name} maxCharacters={16} fontWeight={700} />
					<Symbol>({chartData.symbol})</Symbol>
				</ProtocolName>
				<LiquidationsChartFilters aggregateBy={aggregateBy} />
			</LiquidationsHeaderWrapper>
			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total Liquidable (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>
							${getReadableValue(chartData.totalLiquidable)}
						</p>
						<DownloadButton href={`javascript:alert("TODO: issa not implemented yet");`}>
							<DownloadIcon />
							<span>&nbsp;&nbsp;.csv</span>
						</DownloadButton>
					</BreakpointPanel>
					<PanelHiddenMobile>
						<h2>Change (7d)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}>
							{(chartData.historicalChange[168] * 100).toFixed(1) || 0}%
						</p>
					</PanelHiddenMobile>
					<PanelHiddenMobile>
						<h2>Lending Market Dominance</h2>
						<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}>
							{(chartData.lendingDominance * 100).toFixed(1) || 0}%
						</p>
					</PanelHiddenMobile>
				</BreakpointPanels>
				<BreakpointPanel>
					<LiquidationsChartHeader assetSymbol={chartData.coingeckoAsset.symbol} />
					<LiquidationsChart chart={chart} chartData={chartData} uid={uid} />
				</BreakpointPanel>
			</ChartAndValuesWrapper>
		</>
	)
}

const LiquidationsChartHeader = ({ assetSymbol }: { assetSymbol: string }) => {
	return (
		<RowBetween>
			<h2 style={{ userSelect: 'none' }}>{assetSymbol} liquidation levels</h2>
		</RowBetween>
	)
}

const ButtonDarkStyled = styled(ButtonDark)`
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: row;
	gap: 12px;
	width: 16rem;
	text-align: center;
	user-select: none;
`

const convertChartDataBinsToArray = (obj: ChartDataBin, totalBins: number) => {
	// // this line below suddenly throws error in browser that the iterator cant iterate??
	// const arr = [...Array(totalBins).keys()].map((i) => obj.bins[i] || 0)
	const arr = Array.from({ length: totalBins }, (_, i) => i).map((i) => obj.bins[i] || 0)
	return arr
}

function getReadableValue(value: number) {
	if (value === 0) return '0'
	const s = ['', 'k', 'm', 'b', 't']
	const e = Math.floor(Math.log(value) / Math.log(1000))
	return (value / Math.pow(1000, e)).toFixed(1) + s[e]
}

const getOption = (chart: Chart, chartData: ChartData, isDark: boolean) => {
	const { chartDataBins } = chartData
	// convert chartDataBins to array
	const chartDataBinsArray = Object.keys(chartDataBins).map((key) => ({
		key: key,
		data: convertChartDataBinsToArray(chartDataBins[key], 150)
	}))
	const series = chartDataBinsArray.map((obj) => ({
		type: 'bar',
		name: obj.key,
		data: obj.data,
		tooltip: {
			valueFormatter: (value: string) => `$${getReadableValue(Number(value))}`
		},
		emphasis: {
			focus: 'series'
		},
		stack: 'x'
	}))

	const option = {
		// title: {
		// 	text: `${chart.asset} Liquidation Levels`,
		// 	textStyle: {
		// 		fontFamily: 'inter, sans-serif',
		// 		fontWeight: 600,
		// 		color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
		// 	}
		// },
		grid: {
			left: '2%',
			right: '1%',
			top: '2%',
			bottom: '2%',
			containLabel: true
		},
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'cross'
			}
		},
		xAxis: {
			// bins
			type: 'category',
			// name: 'Liquidation Price',
			// nameLocation: 'middle',
			// nameGap: 30,
			// nameTextStyle: {
			// 	fontFamily: 'inter, sans-serif',
			// 	fontSize: 14,
			// 	fontWeight: 500,
			// 	color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			// },
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			},
			axisLabel: {
				formatter: (value: string) => `$${Number(value).toFixed(3)}`
			},
			axisTick: {
				alignWithLabel: true
			},
			// data: [...Array(chartData.totalBins).keys()].map((x) => x * chartData.binSize)
			data: Array.from({ length: chartData.totalBins }, (_, i) => i).map((x) => x * chartData.binSize)
		},
		yAxis: {
			type: 'value',
			// scale: true,
			// name: 'Liquidable Amount',
			position: 'right',
			// nameGap: 65,
			// nameLocation: 'middle',
			// nameRotate: 270,
			// nameTextStyle: {
			// 	fontFamily: 'inter, sans-serif',
			// 	fontSize: 14,
			// 	fontWeight: 500,
			// 	color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			// },
			axisLabel: {
				formatter: (value: string) => `$${getReadableValue(Number(value))}`
			},
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			}
		},
		series
	}

	return option
}

const LiquidationsChart = ({ chart, chartData, uid }: { chart: Chart; chartData: ChartData; uid: string }) => {
	const [isDark] = useDarkModeManager()

	const createInstance = useCallback(() => {
		console.log(uid)
		const instance = echarts.getInstanceByDom(document.getElementById(uid))

		return instance || echarts.init(document.getElementById(uid))
	}, [uid])

	useEffect(() => {
		const chartInstance = createInstance()
		const option = getOption(chart, chartData, isDark)
		chartInstance.setOption(option)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [uid, chart, chartData, createInstance, isDark])

	return (
		<div
			id={uid}
			style={{
				minHeight: '360px',
				margin: 'auto 0'
			}}
		/>
	)
}

// function OptionsDropdown({ options }: { options: DropdownOption[] }) {
// 	const router = useRouter()
// 	const { asset, aggregateBy, filter } = router.query as Chart
// 	const _asset = asset || defaultChart.asset
// 	const _aggregateBy = aggregateBy || defaultChart.aggregateBy
// 	const _filter = filter || defaultChart.filter

// 	// const updateKey = (key: string, isEnabled: boolean) => {
// 	// 	const newQuery = { ...router.query }
// 	// 	if (_filter === 'all') {
// 	// 		if (!isEnabled) {
// 	// 			newQuery.filter = options.map(({ key }) => key).filter((x) => x !== key)
// 	// 		}
// 	// 	} else {
// 	// 		if (isEnabled) {
// 	// 			newQuery.filter = [...new Set([...newQuery.filter, key])]
// 	// 		} else {
// 	// 			newQuery.filter = (newQuery.filter as string[]).filter((x) => x !== key)
// 	// 		}
// 	// 	}
// 	// }

// 	const updateAttributes = (updatedValues: string[]) => {
// 		if (_filter === 'all') {
// 			options.forEach((option) => {
// 				option.enabled = true
// 			})
// 		} else {
// 			options.forEach((option) => {
// 				const isSelected = updatedValues.includes(option.key)

// 				const isEnabled = state[option.key]

// 				// if ((isEnabled && !isSelected) || (!isEnabled && isSelected)) {
// 				// 	updateKey(option.key, !isEnabled)
// 				// }
// 			})
// 		}
// 	}

// 	// const values = options.filter((o) => state[o.key]).map((o) => o.key)

// 	const select = useSelectState({
// 		value: options.map((x) => x.key),
// 		setValue: updateAttributes,
// 		gutter: 8
// 	})

// 	const clear = () => {
// 		const newQuery = { ...router.query, filter: 'none' }
// 		router.push({ pathname: router.pathname, query: newQuery }, undefined, {
// 			shallow: true
// 		})
// 	}

// 	const toggleAll = () => {
// 		const newQuery = { ...router.query }
// 		delete newQuery.filter
// 		router.push({ pathname: router.pathname, query: newQuery }, undefined, {
// 			shallow: true
// 		})
// 	}

// 	return (
// 		<>
// 			<FilterButton state={select}>
// 				<span>Filter by {_aggregateBy === 'chain' ? 'protocol' : 'chain'}</span>
// 				<MenuButtonArrow />
// 			</FilterButton>
// 			<FilterPopover state={select}>
// 				<Stats>
// 					<button onClick={clear}>clear</button>

// 					<button onClick={toggleAll}>toggle all</button>
// 				</Stats>
// 				{options.map((option) => (
// 					<Item key={option.key} value={option.key}>
// 						{option.name}
// 						<Checkbox checked={_filter === 'all' || _filter.includes(option.key)} />
// 					</Item>
// 				))}
// 			</FilterPopover>
// 		</>
// 	)
// }

export default LiquidationsPage
