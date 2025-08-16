/* eslint-disable no-unused-vars*/
import * as React from 'react'
import {
	ChartData,
	getLiquidationsCsvData,
	getReadableValue,
	PROTOCOL_NAMES_MAP_REVERSE
} from '~/containers/Liquidations/utils'
import { TotalLiquidable } from './TotalLiquidable'
import { LiquidableChanges24H } from './LiquidableChanges24H'
import { LiquidationsContext } from '~/containers/Liquidations/context'
import { useStackBy } from './utils'
import { LIQS_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import Image from 'next/image'
import boboLogo from '~/assets/boboSmug.png'
import { StackBySwitch } from './StackBySwitch'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { download } from '~/utils'
import { Switch } from '~/components/Switch'
import { Icon } from '~/components/Icon'

const LiquidationsChart = React.lazy(() =>
	import('./LiquidationsChart').then((module) => ({ default: module.LiquidationsChart }))
) as React.FC<any>

export const LiquidationsContent = (props: { data: ChartData; prevData: ChartData }) => {
	const { data, prevData } = props
	const [bobo, setBobo] = React.useState(false)
	return (
		<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-3 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
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
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-4 p-3 col-span-2 min-h-[458px]">
				<div className="flex items-center gap-4 flex-wrap">
					<StackBySwitch />
					<CurrencyToggle symbol={data.symbol} />
					<CumulativeToggle />
				</div>
				<button
					onClick={() => setBobo(!bobo)}
					className="absolute -bottom-9 left-0 xl:bottom-[initial] xl:top-0 xl:right-0 xl:left-[initial] z-1"
				>
					<span className="sr-only">Enable Goblin Mode</span>
					<Image src={boboLogo} width={34} height={34} alt="bobo cheers" className="min-h-[34px] w-[34px]" />
				</button>
				<React.Suspense fallback={<></>}>
					<LiquidationsChart chartData={data} uid={data.symbol} bobo={bobo} />
				</React.Suspense>
				<LastUpdated data={data} />
			</div>
		</div>
	)
}

const CurrencyToggle = (props: { symbol: string }) => {
	const [liqsSettings, toggleLiqsSettings] = useLocalStorageSettingsManager('liquidations')
	const { LIQS_USING_USD } = LIQS_SETTINGS
	const isLiqsUsingUsd = liqsSettings[LIQS_USING_USD]

	return (
		<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-(--text-form) max-sm:w-full">
			<button
				data-active={!isLiqsUsingUsd}
				onClick={() => toggleLiqsSettings(LIQS_USING_USD)}
				className="shrink-0 px-3 py-[6px] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
			>
				{props.symbol.toUpperCase()}
			</button>
			<button
				data-active={isLiqsUsingUsd}
				onClick={() => toggleLiqsSettings(LIQS_USING_USD)}
				className="shrink-0 px-3 py-[6px] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
			>
				USD
			</button>
		</div>
	)
}

const CumulativeToggle = () => {
	const [liqsSettings, toggleLiqsSettings] = useLocalStorageSettingsManager('liquidations')
	const { LIQS_CUMULATIVE } = LIQS_SETTINGS
	const isLiqsCumulative = liqsSettings[LIQS_CUMULATIVE]

	return (
		<Switch
			label="Cumulative"
			onChange={() => toggleLiqsSettings(LIQS_CUMULATIVE)}
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
			<span className="text-(--text-label)">Within -20% of current price</span>
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
