import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { useDefiManager, useDarkModeManager } from '~/contexts/LocalStorage'
import type { IChartProps } from '../types'
import { LazyChart } from '~/layout/ProtocolAndPool'
import { Denomination, Filters, FiltersWrapper, Toggle } from './Misc'
import { useFetchAndFormatChartData } from './useFetchAndFormatChartData'
import { EmbedChart } from '~/components/Popover'
import { NftVolumeData } from '~/api/types'
import { BAR_CHARTS } from '../ProtocolChart/utils'
import { TYPE } from '~/Theme'

const AreaChart = dynamic(() => import('.'), {
	ssr: false
}) as React.FC<IChartProps>

interface IProps {
	protocol: string
	color: string
	historicalChainTvls: {}
	chartDenominations: Array<{ symbol: string; geckoId?: string | null }>
	bobo?: boolean
	hallmarks?: Array<[number, string]> | null
	geckoId?: string | null
	chartColors: { [type: string]: string }
	metrics: { [metric: string]: boolean }
	activeUsersId: number | string | null
	usdInflowsData: Array<[string, number]> | null
	governanceApis: Array<string> | null
	isHourlyChart?: boolean
	isCEX?: boolean
	tokenSymbol?: string
	protocolId: string
	twitterHandle?: string
	nftVolumeData: NftVolumeData
	enabled?: Record<string, string>
	name?: string
}

const CHART_TYPES = [
	'tvl',
	'mcap',
	'tokenPrice',
	'tokenVolume',
	'tokenLiquidity',
	'fdv',
	'volume',
	'derivativesVolume',
	'fees',
	'revenue',
	'unlocks',
	'activeUsers',
	'newUsers',
	'transactions',
	'gasUsed',
	'events',
	'staking',
	'borrowed',
	'medianApy',
	'usdInflows',
	'governance',
	'bridgeVolume',
	'twitter',
	'devMetrics',
	'contributersMetrics',
	'contributersCommits',
	'devCommits',
	'nftVolume'
]

export default function ProtocolChart({
	protocol,
	color,
	historicalChainTvls,
	bobo = false,
	hallmarks,
	geckoId,
	chartColors,
	metrics,
	activeUsersId,
	usdInflowsData,
	governanceApis,
	isHourlyChart,
	isCEX,
	tokenSymbol,
	protocolId,
	chartDenominations,
	twitterHandle,
	nftVolumeData,
	enabled,
	name
}: IProps) {
	const router = useRouter()

	const [extraTvlEnabled] = useDefiManager()
	const [isThemeDark] = useDarkModeManager()

	const {
		denomination,
		groupBy,
		tvl,
		mcap,
		tokenPrice,
		fdv,
		volume,
		derivativesVolume,
		fees,
		revenue,
		unlocks,
		activeUsers,
		newUsers,
		events,
		transactions,
		gasUsed,
		staking,
		borrowed,
		medianApy,
		usdInflows,
		governance,
		treasury,
		bridgeVolume,
		tokenVolume,
		tokenLiquidity,
		twitter,
		devMetrics,
		contributersMetrics,
		contributersCommits,
		devCommits,
		nftVolume
	} = enabled || router.query

	const { fetchingTypes, isLoading, chartData, chartsUnique, unlockTokenSymbol, valueSymbol } =
		useFetchAndFormatChartData({
			isRouterReady: router.isReady,
			denomination,
			groupBy,
			tvl,
			mcap,
			tokenPrice,
			fdv,
			volume,
			derivativesVolume,
			fees,
			revenue,
			unlocks,
			activeUsers,
			newUsers,
			events,
			transactions,
			gasUsed,
			staking,
			borrowed,
			medianApy,
			usdInflows,
			governance,
			treasury,
			bridgeVolume,
			tokenVolume,
			tokenLiquidity,
			protocol,
			chartDenominations,
			geckoId,
			metrics,
			activeUsersId,
			governanceApis,
			protocolId,
			historicalChainTvls,
			extraTvlEnabled,
			isHourlyChart,
			usdInflowsData,
			twitter,
			twitterHandle,
			devMetrics,
			contributersMetrics,
			contributersCommits,
			devCommits,
			nftVolume,
			nftVolumeData
		})

	const realPathname =
		`/${isCEX ? 'cex' : 'protocol'}/${protocol}?` +
		CHART_TYPES.reduce((acc, curr) => {
			if (router.query[curr]) {
				acc += `${curr}=${router.query[curr]}&`
			}
			return acc
		}, '')

	const hasAtleasOneBarChart = chartsUnique.reduce((acc, curr) => {
		if (BAR_CHARTS.includes(curr)) {
			acc = true
		}

		return acc
	}, false)

	return (
		<Wrapper>
			<FiltersWrapper>
				<TYPE.heading>{name}</TYPE.heading>
				<EmbedChart color={color} />
			</FiltersWrapper>

			<ProtocolChartOnly
				isRouterReady={router.isReady}
				isLoading={isLoading}
				fetchingTypes={fetchingTypes}
				chartData={chartData}
				color={color}
				valueSymbol={valueSymbol}
				chartsUnique={chartsUnique}
				events={events}
				hallmarks={hallmarks}
				chartColors={chartColors}
				bobo={bobo}
				unlockTokenSymbol={unlockTokenSymbol}
				isThemeDark={isThemeDark}
				isMonthly={groupBy === 'monthly'}
			/>
		</Wrapper>
	)
}

export const ProtocolChartOnly = ({
	isRouterReady,
	isLoading,
	fetchingTypes,
	chartData,
	color,
	valueSymbol,
	chartsUnique,
	events,
	hallmarks,
	chartColors,
	bobo,
	unlockTokenSymbol,
	isThemeDark,
	isMonthly
}) => {
	return (
		<LazyChart style={{ padding: 0, minHeight: '360px' }}>
			{!isRouterReady ? null : isLoading ? (
				<p style={{ position: 'relative', top: '180px', textAlign: 'center' }}>{`Fetching ${fetchingTypes.join(
					', '
				)} ...`}</p>
			) : (
				<AreaChart
					chartData={chartData}
					color={color}
					title=""
					valueSymbol={valueSymbol}
					stacks={chartsUnique}
					hallmarks={!(events === 'false') && hallmarks}
					tooltipSort={false}
					stackColors={chartColors}
					style={{
						...(bobo && {
							backgroundImage: 'url("/bobo.png")',
							backgroundSize: '100% 360px',
							backgroundRepeat: 'no-repeat',
							backgroundPosition: 'bottom'
						})
					}}
					unlockTokenSymbol={unlockTokenSymbol}
					isThemeDark={isThemeDark}
					isMonthly={isMonthly}
				/>
			)}
		</LazyChart>
	)
}

export const Wrapper = styled.div`
	border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#1c1e23' : '#ece3e3')};
	border-radius: 12px;
	gap: 16px;
	padding: 16px 0;
	grid-column: span 1;
`

export const ToggleWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin: 0 16px;
`

export { Denomination, Filters, Toggle }
