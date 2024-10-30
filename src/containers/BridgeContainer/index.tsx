import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import Layout from '~/layout'
import { Button, DetailsWrapper, LazyChart, Name } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { BridgesSearch } from '~/components/Search/Bridges'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import SEO from '~/components/SEO'
import { BRIDGES_SHOWING_ADDRESSES, useBridgesManager } from '~/contexts/LocalStorage'
import { formattedNum, getPercentChange } from '~/utils'
import type { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { BridgeTokensTable, BridgeAddressesTable } from '~/components/Table'
import { AddressesTableSwitch } from '~/containers/BridgesPage/TableSwitch'
import { BridgeChainSelector } from '~/containers/BridgesPage/BridgeChainSelector'
import { Filters, Denomination } from '~/components/ECharts/ProtocolChart/Misc'
import { getBridgePageDatanew } from '~/api/categories/bridges'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const TableNoticeWrapper = styled.div`
	display: flex;
	gap: 16px;
	align-items: flex-end;
	justify-content: space-between;
	flex-wrap: wrap;
	margin-bottom: -2rem;

	p {
		opacity: 0.6;
		font-size: 0.875rem;
		font-style: italic;
	}
`

const BridgeInfo = ({
	displayName,
	logo,
	chains,
	defaultChain,
	volumeDataByChain,
	tableDataByChain,
	config = {} as Record<string, string>
}) => {
	const [chartType, setChartType] = React.useState('Inflows')
	const [currentChain, setChain] = React.useState(defaultChain)

	const [bridgesSettings] = useBridgesManager()
	const isBridgesShowingAddresses = bridgesSettings[BRIDGES_SHOWING_ADDRESSES]

	const { tokensTableData, addressesTableData, tokenDeposits, tokenWithdrawals } = tableDataByChain[currentChain]

	const volumeChartDataByChain = volumeDataByChain[currentChain]
	const prevDayChart = volumeChartDataByChain[volumeChartDataByChain.length - 2]
	const currentDepositsUSD = prevDayChart?.Deposited ?? 0
	const currentWithdrawalsUSD = -(prevDayChart?.Withdrawn ?? 0)
	const currentVolume = currentDepositsUSD + currentWithdrawalsUSD

	let volPercentChange = '0 '

	if (volumeChartDataByChain.length > 3) {
		const prev2DayChart = volumeChartDataByChain[volumeChartDataByChain.length - 3]
		const prevDepositsUSD = prev2DayChart.Deposited ?? 0
		const prevWithdrawalsUSD = -(prev2DayChart.Withdrawn ?? 0)
		const prevVolume = prevDepositsUSD + prevWithdrawalsUSD
		if (prevVolume > 0) {
			volPercentChange = getPercentChange(currentVolume, prevVolume)?.toFixed(2)
		}
	}

	const chainOptions = chains.map((chain) => {
		return { name: chain, route: '' }
	})

	return (
		<>
			<StatsSection>
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={logo} size={24} />
						<FormattedName text={displayName ? displayName + ' ' : ''} maxCharacters={25} fontWeight={700} />
					</Name>

					<BridgeChainSelector currentChain={currentChain} options={chainOptions} handleClick={setChain} />

					<Stat>
						<span>Deposited to {currentChain} (24h)</span>
						<span>
							{formattedNum(
								currentChain === 'All Chains' ? config?.last24hVolume || '0' : currentDepositsUSD || '0',
								true
							)}
						</span>
					</Stat>

					<Stat>
						<span>Withdrawn from {currentChain} (24h)</span>
						<span>
							{formattedNum(
								currentChain === 'All Chains' ? config?.last24hVolume || '0' : currentWithdrawalsUSD || '0',
								true
							)}
						</span>
					</Stat>

					<Stat>
						<span>Volume Change (24h)</span>
						<span>{volPercentChange + '%'}</span>
					</Stat>
					{config?.url ? (
						<Link href={config.url} passHref>
							<Button
								as="a"
								target="_blank"
								rel="noopener noreferrer"
								useTextColor={true}
								style={{
									width: '120px',
									display: 'flex',
									justifyContent: 'center',
									marginLeft: '-8px',
									marginTop: '-16px'
								}}
							>
								<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
							</Button>
						</Link>
					) : null}
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
					<Filters style={{ margin: '16px 16px 0' }}>
						<Denomination as="button" active={chartType === 'Inflows'} onClick={() => setChartType('Inflows')}>
							Inflows
						</Denomination>
						<Denomination as="button" active={chartType === 'Tokens To'} onClick={() => setChartType('Tokens To')}>
							Tokens To
						</Denomination>
						<Denomination as="button" active={chartType === 'Tokens From'} onClick={() => setChartType('Tokens From')}>
							Tokens From
						</Denomination>
					</Filters>
					<LazyChart>
						{chartType === 'Inflows' && volumeChartDataByChain && volumeChartDataByChain.length > 0 && (
							<BarChart
								chartData={volumeChartDataByChain}
								title=""
								chartOptions={volumeChartOptions}
								stacks={inflowChartStacks}
							/>
						)}
						{chartType === 'Tokens To' && tokenWithdrawals && tokenWithdrawals.length > 0 && (
							<PieChart chartData={tokenWithdrawals} />
						)}
						{chartType === 'Tokens From' && tokenDeposits && tokenDeposits.length > 0 && (
							<PieChart chartData={tokenDeposits} />
						)}
					</LazyChart>
				</div>
			</StatsSection>

			<TableNoticeWrapper>
				<AddressesTableSwitch />

				<p>All stats in table are for the previous day.</p>
			</TableNoticeWrapper>

			{isBridgesShowingAddresses ? (
				<BridgeAddressesTable data={addressesTableData} />
			) : (
				<BridgeTokensTable data={tokensTableData} />
			)}
		</>
	)
}

export default function BridgeContainer(props) {
	return (
		<Layout
			title={`${props.displayName}: Bridge Volume - DefiLlama`}
			// backgroundColor={transparentize(0.6, backgroundColor)}
			style={{ gap: '48px' }}
		>
			<SEO cardName={props.displayName} token={props.displayName} />

			<BridgesSearch
				step={{
					category: 'Bridges',
					name: props.displayName
				}}
			/>

			<BridgeInfo {...props} />
		</Layout>
	)
}

export const BridgeContainerOnClient = ({ protocol }: { protocol: string }) => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['bridged-data', protocol],
		queryFn: () => getBridgePageDatanew(protocol),
		staleTime: 60 * 60 * 1000
	})

	if (isLoading) {
		return <p style={{ margin: '100px 0', textAlign: 'center' }}></p>
	}

	if (error) {
		return <p style={{ margin: '100px 0', textAlign: 'center' }}>Something went wrong, couldn't fetch data</p>
	}

	return (
		<InfoWrapper>
			<BridgeInfo {...data} />
		</InfoWrapper>
	)
}

export const useFetchBridgeVolumeOnAllChains = (protocol?: string | null) => {
	return useQuery({
		queryKey: ['bridged-volume-on-all-chains', protocol],
		queryFn: protocol
			? () => getBridgePageDatanew(protocol).then((data) => data.volumeDataByChain['All Chains'])
			: () => null,
		staleTime: 60 * 60 * 1000
	})
}
const volumeChartOptions = {
	overrides: {
		inflow: true
	}
}

const InfoWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 40px;
	padding: 16px;
`
const inflowChartStacks = {
	Deposited: 'stackA',
	Withdrawn: 'stackA'
}

const Stat = styled.h1`
	font-size: 1.5rem;
	font-weight: 600;
	display: flex;
	flex-direction: column;
	gap: 8px;

	& > *:first-child {
		font-weight: 400;
		font-size: 1rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#cccccc' : '#545757')};
	}

	& > *:nth-child(2) {
		font-family: var(--font-jetbrains);
		min-height: 2rem;
	}
`
