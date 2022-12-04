import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import Layout from '~/layout'
import { DetailsWrapper, Name } from '~/layout/ProtocolAndPool'
import { Stat, StatsSection, StatWrapper } from '~/layout/Stats/Medium'
import { BridgesSearch } from '~/components/Search'
import { OptionButton } from '~/components/ButtonStyled'
import TokenLogo from '~/components/TokenLogo'
import { AutoRow, RowBetween } from '~/components/Row'
import { PeggedChainResponsivePie } from '~/components/Charts'
import FormattedName from '~/components/FormattedName'
import SEO from '~/components/SEO'

import { useXl, useMed } from '~/hooks/useBreakpoints'
import { BRIDGES_SHOWING_ADDRESSES, useBridgesManager } from '~/contexts/LocalStorage'
import { getRandomColor, formattedNum, getPercentChange } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'
import { BridgeTokensTable, BridgeAddressesTable } from '~/components/Table'
import { AddressesTableSwitch } from '~/components/BridgesPage/TableSwitch'
import { DailyBridgeStats } from '~/api/categories/bridges/utils'
import { BridgeChainSelector } from '~/components/BridgesPage/BridgeChainSelector'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const TableNoticeWrapper = styled.div`
	margin-top: -2rem;
	margin-bottom: -2rem;
`

const SmolHints = styled.div`
	display: flex;
	gap: 6px;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	opacity: 0.6;
`

export default function BridgeContainer({
	displayName,
	logo,
	chains,
	defaultChain,
	chainToChartDataIndex,
	bridgeChartDataByChain,
	prevDayDataByChain
}) {
	const [chartType, setChartType] = useState('Inflows')
	const [currentChain, setChain] = useState(defaultChain)

	const [bridgesSettings] = useBridgesManager()
	const isBridgesShowingAddresses = bridgesSettings[BRIDGES_SHOWING_ADDRESSES]

	const belowMed = useMed()
	const belowXl = useXl()
	const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

	// can refactor, make some functions here
	const { tokensTableData, addressesTableData, tokenDeposits, tokenWithdrawals, tokenColor } = React.useMemo(() => {
		const chartIndex = chainToChartDataIndex[currentChain]
		const prevDayData: DailyBridgeStats = prevDayDataByChain[chartIndex]
		let tokensTableData = [],
			addressesTableData = [],
			tokenDeposits = [],
			tokenWithdrawals = [],
			tokenColor = {}
		if (prevDayData) {
			const totalTokensDeposited = prevDayData.totalTokensDeposited
			const totalTokensWithdrawn = prevDayData.totalTokensWithdrawn
			let tokensTableUnformatted = {}
			Object.entries(totalTokensDeposited).map(([token, tokenData]) => {
				const symbol = tokenData.symbol == null || tokenData.symbol === '' ? 'unknown' : tokenData.symbol
				const usdValue = tokenData.usdValue
				const key = `${symbol}#${token}`
				tokensTableUnformatted[key] = tokensTableUnformatted[key] || {}
				tokensTableUnformatted[key].deposited = (tokensTableUnformatted[key].deposited ?? 0) + usdValue
				tokensTableUnformatted[key].volume = (tokensTableUnformatted[key].volume ?? 0) + usdValue
				// ensure there are no undefined values for deposited/withdrawn so table can be sorted
				tokensTableUnformatted[key].withdrawn = 0
			})
			Object.entries(totalTokensWithdrawn).map(([token, tokenData]) => {
				const symbol = tokenData.symbol == null || tokenData.symbol === '' ? 'unknown' : tokenData.symbol
				const usdValue = tokenData.usdValue ?? 0
				const key = `${symbol}#${token}`
				tokensTableUnformatted[key] = tokensTableUnformatted[key] || {}
				tokensTableUnformatted[key].withdrawn = (tokensTableUnformatted[key].withdrawn ?? 0) + usdValue
				tokensTableUnformatted[key].volume = (tokensTableUnformatted[key].volume ?? 0) + usdValue
				if (!tokensTableUnformatted[key].deposited) {
					tokensTableUnformatted[key].deposited = 0
				}
			})

			tokensTableData = Object.entries(tokensTableUnformatted)
				.filter(([symbol, volumeData]: [string, any]) => {
					return volumeData.volume !== 0
				})
				.map((entry: [string, object]) => {
					return { symbol: entry[0], ...entry[1] }
				})

			const fullTokenDeposits = Object.values(totalTokensDeposited).map((tokenData) => {
				return { name: tokenData.symbol, value: tokenData.usdValue }
			})
			const otherDeposits = fullTokenDeposits.slice(10).reduce((total, entry) => {
				return (total += entry.value)
			}, 0)
			tokenDeposits = fullTokenDeposits
				.slice(0, 10)
				.sort((a, b) => b.value - a.value)
				.concat({ name: 'Others', value: otherDeposits })
			const fullTokenWithdrawals = Object.values(totalTokensWithdrawn).map((tokenData) => {
				return { name: tokenData.symbol, value: tokenData.usdValue }
			})
			const otherWithdrawals = fullTokenWithdrawals.slice(10).reduce((total, entry) => {
				return (total += entry.value)
			}, 0)
			tokenWithdrawals = fullTokenWithdrawals
				.slice(0, 10)
				.sort((a, b) => b.value - a.value)
				.concat({ name: 'Others', value: otherWithdrawals })
			tokenColor = Object.fromEntries(
				[...tokenDeposits, ...tokenWithdrawals, 'Others'].map((token) => {
					return typeof token === 'string' ? ['-', getRandomColor()] : [token.name, getRandomColor()]
				})
			)
			const totalAddressesDeposited = prevDayData.totalAddressDeposited
			const totalAddressesWithdrawn = prevDayData.totalAddressWithdrawn
			let addressesTableUnformatted = {}
			Object.entries(totalAddressesDeposited).map(([address, addressData]) => {
				const txs = addressData.txs
				const usdValue = addressData.usdValue
				addressesTableUnformatted[address] = addressesTableUnformatted[address] || {}
				addressesTableUnformatted[address].deposited = (addressesTableUnformatted[address].deposited ?? 0) + usdValue
				addressesTableUnformatted[address].txs = (addressesTableUnformatted[address].txs ?? 0) + txs
			})
			Object.entries(totalAddressesWithdrawn).map(([address, addressData]) => {
				const txs = addressData.txs
				const usdValue = addressData.usdValue
				addressesTableUnformatted[address] = addressesTableUnformatted[address] || {}
				addressesTableUnformatted[address].withdrawn = (addressesTableUnformatted[address].withdrawn ?? 0) + usdValue
				addressesTableUnformatted[address].txs = (addressesTableUnformatted[address].txs ?? 0) + txs
			})
			addressesTableData = Object.entries(addressesTableUnformatted)
				.filter(([address, addressData]: [string, any]) => {
					return addressData.txs !== 0
				})
				.map((entry: [string, object]) => {
					return { address: entry[0], deposited: 0, withdrawn: 0, ...entry[1] }
				})
		}
		return { tokensTableData, addressesTableData, tokenDeposits, tokenWithdrawals, tokenColor }
	}, [prevDayDataByChain, chainToChartDataIndex, currentChain])

	const { currentDepositsUSD, currentWithdrawalsUSD, volPercentChange, volumeChartData } = React.useMemo(() => {
		const chartIndex = chainToChartDataIndex[currentChain]
		const chainChartData = bridgeChartDataByChain[chartIndex]
		const prevDayChart = chainChartData[chainChartData.length - 1]
		const currentDepositsUSD = prevDayChart?.depositUSD ?? 0
		const currentWithdrawalsUSD = prevDayChart?.withdrawUSD ?? 0
		const currentVolume = currentDepositsUSD + currentWithdrawalsUSD

		let volPercentChange = '0 '
		if (chainChartData.length > 1) {
			const prev2DayChart = chainChartData[chainChartData.length - 2]
			const prevDepositsUSD = prev2DayChart.depositUSD ?? 0
			const prevWithdrawalsUSD = prev2DayChart.withdrawUSD ?? 0
			const prevVolume = prevDepositsUSD + prevWithdrawalsUSD
			if (prevVolume > 0) {
				volPercentChange = getPercentChange(currentVolume, prevVolume)?.toFixed(2)
			}
		}

		const volumeChartData = chainChartData.map((entry) => {
			return {
				date: entry.date,
				'Deposited': entry.withdrawUSD,
				'Withdrawn': -entry.depositUSD
			}
		})

		return { currentDepositsUSD, currentWithdrawalsUSD, volPercentChange, volumeChartData }
	}, [chainToChartDataIndex, bridgeChartDataByChain, currentChain])

	const chainOptions = chains.map((chain) => {
		return { name: chain, route: '' }
	})

	return (
		<Layout
			title={`${displayName}: Bridge Volume - DefiLlama`}
			// backgroundColor={transparentize(0.6, backgroundColor)}
			style={{ gap: '48px' }}
		>
			<SEO cardName={displayName} token={displayName} />

			<BridgesSearch
				step={{
					category: 'Bridges',
					name: displayName
				}}
			/>

			<StatsSection>
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={logo} size={24} />
						<FormattedName text={displayName ? displayName + ' ' : ''} maxCharacters={25} fontWeight={700} />
					</Name>

					<BridgeChainSelector currentChain={currentChain} options={chainOptions} handleClick={setChain} />

					<StatWrapper>
						<Stat>
							<span>Deposited to {currentChain} (24h)</span>
							<span>{formattedNum(currentWithdrawalsUSD || '0', true)}</span>
						</Stat>
						{/*
								<DownloadButton onClick={downloadCsv}>
									<DownloadCloud size={14} />
									<span>&nbsp;&nbsp;.csv</span>
								</DownloadButton>
								*/}
					</StatWrapper>

					<StatWrapper>
						<Stat>
							<span>Withdrawn from {currentChain} (24h)</span>
							<span>{formattedNum(currentDepositsUSD || '0', true)}</span>
						</Stat>
					</StatWrapper>

					<StatWrapper>
						<Stat>
							<span>Volume Change (24h)</span>
							<span>{volPercentChange + '%'}</span>
						</Stat>
					</StatWrapper>
				</DetailsWrapper>

				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						gap: '16px',
						padding: '0 0 20px 0',
						minHeight: '460px'
					}}
				>
					<RowBetween my={useMed ? 20 : 0} mx={useMed ? 10 : 0} align="flex-start">
						<AutoRow style={{ width: 'fit-content' }} justify="flex-end" gap="6px" align="flex-start">
							<OptionButton active={chartType === 'Inflows'} onClick={() => setChartType('Inflows')}>
								Inflows
							</OptionButton>
							<OptionButton active={chartType === 'Tokens To'} onClick={() => setChartType('Tokens To')}>
								Tokens To
							</OptionButton>
							<OptionButton active={chartType === 'Tokens From'} onClick={() => setChartType('Tokens From')}>
								Tokens From
							</OptionButton>
						</AutoRow>
					</RowBetween>
					{chartType === 'Inflows' && volumeChartData && volumeChartData.length > 0 && (
						<BarChart
							chartData={volumeChartData}
							title=""
							hidedefaultlegend={true}
							customLegendName="Volume"
							customLegendOptions={['Deposited', 'Withdrawn']}
							key={['Deposited', 'Withdrawn'] as any} // escape hatch to rerender state in legend options
							chartOptions={volumeChartOptions}
						/>
					)}
					{chartType === 'Tokens To' && tokenWithdrawals && tokenWithdrawals.length > 0 && (
						<PeggedChainResponsivePie data={tokenWithdrawals} chainColor={tokenColor} aspect={aspect} />
					)}
					{chartType === 'Tokens From' && tokenDeposits && tokenDeposits.length > 0 && (
						<PeggedChainResponsivePie data={tokenDeposits} chainColor={tokenColor} aspect={aspect} />
					)}
				</div>
			</StatsSection>

			<AddressesTableSwitch />

			<TableNoticeWrapper>
				<SmolHints>
					<i>All stats in table are for the previous day.</i>
				</SmolHints>
			</TableNoticeWrapper>

			{!isBridgesShowingAddresses && <BridgeTokensTable data={tokensTableData} />}
			{isBridgesShowingAddresses && <BridgeAddressesTable data={addressesTableData} />}
		</Layout>
	)
}

const volumeChartOptions = {
	overrides: {
		inflow: true
	}
}
