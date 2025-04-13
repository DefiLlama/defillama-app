/* eslint-disable no-unused-vars*/
import * as React from 'react'
import ReactSwitch from 'react-switch'
import { ChartData, getLiquidationsCsvData, getReadableValue, PROTOCOL_NAMES_MAP_REVERSE } from '~/utils/liquidations'
import { TotalLiquidable } from './TotalLiquidable'
import { LiquidableChanges24H } from './LiquidableChanges24H'
import { LiquidationsContext } from '~/containers/LiquidationsPage/context'
import { useStackBy } from './utils'
import { LIQS_SETTINGS, useLiqsManager } from '~/contexts/LocalStorage'
import Image from 'next/future/image'
import boboLogo from '~/assets/boboSmug.png'
import dynamic from 'next/dynamic'
import { StackBySwitch } from './StackBySwitch'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { download } from '~/utils'
import { Switch } from '~/components/Switch'
import { Icon } from '~/components/Icon'

const LiquidationsChart = dynamic(() => import('./LiquidationsChart').then((module) => module.LiquidationsChart), {
	ssr: false
}) as React.FC<any>

export const LiquidationsContent = (props: { data: ChartData; prevData: ChartData }) => {
	const { data, prevData } = props
	const [bobo, setBobo] = React.useState(false)
	return (
		<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] gap-1">
			<div className="text-base flex flex-col gap-5 p-6 col-span-1 w-full xl:w-[380px] bg-[var(--cards-bg)] rounded-md overflow-x-auto">
				<p className="flex flex-col">
					<TotalLiquidable {...data} />
				</p>
				<p className="hidden md:flex flex-col">
					<LiquidableChanges24H data={data} prevData={prevData} />
				</p>
				<p className="hidden md:flex flex-col">
					<DangerousPositionsAmount data={data} />
				</p>
				<CSVDownloadButton
					onClick={async () => {
						const csvString = await getLiquidationsCsvData(data.symbol)
						download(`${data.symbol}-all-positions.csv`, csvString)
					}}
					className="mt-auto mr-auto"
				/>
			</div>
			<div className="flex flex-col gap-4 p-3 col-span-1 min-h-[458px] bg-[var(--cards-bg)] rounded-md">
				<div className="flex items-center gap-4 flex-wrap">
					<StackBySwitch />
					<CurrencyToggle symbol={data.symbol} />
					<CumulativeToggle />
				</div>
				<button
					onClick={() => setBobo(!bobo)}
					className="absolute -bottom-9 left-0 xl:bottom-[initial] xl:top-0 xl:right-0 xl:left-[initial] z-[1]"
				>
					<span className="sr-only">Enable Goblin Mode</span>
					<Image src={boboLogo} width="34px" height="34px" alt="bobo cheers" className="h-[34px] w-[34px]" />
				</button>
				<LiquidationsChart chartData={data} uid={data.symbol} bobo={bobo} />
				<LastUpdated data={data} />
			</div>
		</div>
	)
}

const CurrencyToggle = (props: { symbol: string }) => {
	const [liqsSettings, toggleLiqsSettings] = useLiqsManager()
	const { LIQS_USING_USD } = LIQS_SETTINGS
	const isLiqsUsingUsd = liqsSettings[LIQS_USING_USD]

	return (
		<div className="flex items-center rounded-md overflow-x-auto flex-nowrap border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296]">
			<button
				data-active={!isLiqsUsingUsd}
				onClick={toggleLiqsSettings(LIQS_USING_USD)}
				className="flex items-center gap-1 flex-shrink-0 py-2 px-3 whitespace-nowrap font-medium text-sm hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
			>
				{props.symbol.toUpperCase()}
			</button>
			<button
				data-active={isLiqsUsingUsd}
				onClick={toggleLiqsSettings(LIQS_USING_USD)}
				className="flex items-center gap-1 flex-shrink-0 py-2 px-3 whitespace-nowrap font-medium text-sm hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
			>
				USD
			</button>
		</div>
	)
}

const CumulativeToggle = () => {
	const [liqsSettings, toggleLiqsSettings] = useLiqsManager()
	const { LIQS_CUMULATIVE } = LIQS_SETTINGS
	const isLiqsCumulative = liqsSettings[LIQS_CUMULATIVE]

	return (
		<Switch
			label="Cumulative"
			onChange={toggleLiqsSettings(LIQS_CUMULATIVE)}
			checked={isLiqsCumulative}
			value="Cumulative"
		/>
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

const LastUpdated = ({ data }) => {
	const [minutesAgo, setMinutesAgo] = React.useState(Math.round((Date.now() - data?.time * 1000) / 1000 / 60))

	React.useEffect(() => {
		const interval = setInterval(() => {
			setMinutesAgo((x) => x + 1)
		}, 1000 * 60)
		return () => clearInterval(interval)
	}, [])

	return (
		<>
			<p className="flex items-center justify-end gap-1 flex-nowrap italic -mt-4 opacity-60">
				<Icon name="clock" height={12} width={13} />
				<span suppressHydrationWarning>Last updated {minutesAgo}min ago</span>
			</p>
		</>
	)
}
