/* eslint-disable no-unused-vars*/
import * as React from 'react'
import ReactSwitch from 'react-switch'
import { ChartData, getReadableValue, PROTOCOL_NAMES_MAP_REVERSE } from '~/utils/liquidations'
import { TotalLiquidable } from './TotalLiquidable'
import { LiquidableChanges24H } from './LiquidableChanges24H'
import { LiquidationsContext } from '~/containers/LiquidationsPage/context'
import { useStackBy } from './utils'
import { LIQS_SETTINGS, useLiqsManager } from '~/contexts/LocalStorage'
import Image from 'next/future/image'
import boboLogo from '~/assets/boboSmug.png'
import dynamic from 'next/dynamic'
import { StackBySwitch } from './StackBySwitch'

const LiquidationsChart = dynamic(() => import('./LiquidationsChart').then((module) => module.LiquidationsChart), {
	ssr: false
}) as React.FC<any>

export const LiquidationsContent = (props: { data: ChartData; prevData: ChartData }) => {
	const { data, prevData } = props
	const [bobo, setBobo] = React.useState(false)
	return (
		<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
			<div className="flex flex-col gap-5 p-6 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
				<p className="flex flex-col">
					<TotalLiquidable {...data} />
				</p>
				<p className="hidden md:flex flex-col">
					<LiquidableChanges24H data={data} prevData={prevData} />
				</p>
				<p className="hidden md:flex flex-col">
					<DangerousPositionsAmount data={data} />
				</p>
			</div>
			<div className="flex flex-col gap-4 py-4 col-span-1 min-h-[438px]">
				<div className="flex items-center gap-4 -mt-2 mb-auto mx-2 flex-wrap">
					<StackBySwitch />
					<CumulativeToggle />
					<CurrencyToggle symbol={data.symbol} />
				</div>
				<button
					onClick={() => setBobo(!bobo)}
					className="absolute -bottom-9 left-0 xl:bottom-[initial] xl:top-0 xl:right-0 xl:left-[initial] z-[1]"
				>
					<span className="sr-only">Enable Goblin Mode</span>
					<Image src={boboLogo} width="34px" height="34px" alt="bobo cheers" className="h-[34px] w-[34px]" />
				</button>
				<LiquidationsChart chartData={data} uid={data.symbol} bobo={bobo} />
			</div>
		</div>
	)
}

const CurrencyToggle = (props: { symbol: string }) => {
	const [liqsSettings, toggleLiqsSettings] = useLiqsManager()
	const { LIQS_USING_USD } = LIQS_SETTINGS
	const isLiqsUsingUsd = liqsSettings[LIQS_USING_USD]

	return (
		<div className="flex items-center gap-1 mr-2">
			{props.symbol.toUpperCase()}
			{/* @ts-ignore:next-line */}
			<ReactSwitch
				onChange={toggleLiqsSettings(LIQS_USING_USD)}
				checked={isLiqsUsingUsd}
				onColor="#0A71F1"
				offColor="#0A71F1"
				height={20}
				width={40}
				uncheckedIcon={false}
				checkedIcon={false}
			/>
			<span>USD</span>
		</div>
	)
}

const CumulativeToggle = () => {
	const [liqsSettings, toggleLiqsSettings] = useLiqsManager()
	const { LIQS_CUMULATIVE } = LIQS_SETTINGS
	const isLiqsCumulative = liqsSettings[LIQS_CUMULATIVE]

	return (
		<div className="flex items-center gap-1 ml-auto">
			{/* @ts-ignore:next-line */}
			<ReactSwitch
				onChange={toggleLiqsSettings(LIQS_CUMULATIVE)}
				checked={isLiqsCumulative}
				onColor="#0A71F1"
				height={20}
				width={40}
				uncheckedIcon={false}
				checkedIcon={false}
			/>
			<span>Cumulative</span>
		</div>
	)
}

const DangerousPositionsAmount = (props: { data: ChartData }) => {
	const stackBy = useStackBy()
	const { selectedSeries } = React.useContext(LiquidationsContext)
	const dangerousPositionsAmount = React.useMemo(
		() => getDangerousPositionsAmount(props.data, stackBy, selectedSeries),
		[props.data, stackBy, selectedSeries]
	)
	return (
		<>
			<span className="text-[#545757] dark:text-[#cccccc]">Within -20% of current price</span>
			<span className="font-semibold text-2xl font-jetbrains">${getReadableValue(dangerousPositionsAmount)}</span>
		</>
	)
}

const getDangerousPositionsAmount = (
	data: ChartData,
	stackBy: 'chains' | 'protocols',
	selectedSeries: {
		[key: string]: boolean
	},
	threshold = -0.2
) => {
	const priceThreshold = data.currentPrice * (1 + threshold)
	let dangerousPositionsAmount = 0
	if (!selectedSeries) {
		dangerousPositionsAmount = data.dangerousPositionsAmount
	} else if (stackBy === 'chains') {
		Object.keys(selectedSeries)
			.filter((chain) => selectedSeries[chain])
			.forEach((chain) => {
				const _chain = PROTOCOL_NAMES_MAP_REVERSE[chain]
				const binSize = data.chartDataBins.chains[_chain]?.binSize ?? 0
				dangerousPositionsAmount += Object.entries(data.chartDataBins.chains[_chain]?.bins ?? {})
					.filter(([bin]) => binSize * parseInt(bin) >= priceThreshold)
					.reduce((acc, [, value]) => acc + value['usd'], 0)
			})
	} else {
		Object.keys(selectedSeries)
			.filter((protocol) => selectedSeries[protocol])
			.forEach((protocol) => {
				const _protocol = PROTOCOL_NAMES_MAP_REVERSE[protocol]
				const binSize = data.chartDataBins.protocols[_protocol]?.binSize ?? 0
				dangerousPositionsAmount += Object.entries(data.chartDataBins.protocols[_protocol]?.bins ?? {})
					.filter(([bin]) => binSize * parseInt(bin) >= priceThreshold)
					.reduce((acc, [, value]) => acc + value['usd'], 0)
			})
	}
	return dangerousPositionsAmount
}
