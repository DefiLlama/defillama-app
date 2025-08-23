import * as React from 'react'
import Image from 'next/image'
import boboLogo from '~/assets/boboSmug.png'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { ISearchItem } from '~/components/Search/types'
import { Switch } from '~/components/Switch'
import { LiquidationsContext } from '~/containers/Liquidations/context'
import {
	ChartData,
	getLiquidationsCsvData,
	getReadableValue,
	PROTOCOL_NAMES_MAP_REVERSE
} from '~/containers/Liquidations/utils'
import { LIQS_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { download, liquidationsIconUrl } from '~/utils'
import { LiquidableChanges24H } from './LiquidableChanges24H'
import { StackBySwitch } from './StackBySwitch'
import { TotalLiquidable } from './TotalLiquidable'
import { useStackBy } from './utils'

const LiquidationsChart = React.lazy(() =>
	import('./LiquidationsChart').then((module) => ({ default: module.LiquidationsChart }))
) as React.FC<any>

export const LiquidationsContent = (props: { data: ChartData; prevData: ChartData; options: ISearchItem[] }) => {
	const { data, prevData } = props
	const [bobo, setBobo] = React.useState(false)
	return (
		<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
			<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
				<h1 className="flex items-center gap-2">
					<img
						src={liquidationsIconUrl(data.symbol.toLowerCase())}
						alt={data.name}
						width={24}
						height={24}
						className="shrink-0 rounded-full"
					/>
					<span className="text-xl font-semibold">
						{data.name} (${data.symbol.toUpperCase()})
					</span>
				</h1>
				<p className="flex flex-col">
					<TotalLiquidable {...data} />
				</p>
				<p className="hidden flex-col md:flex">
					<LiquidableChanges24H data={data} prevData={prevData} />
				</p>
				<p className="hidden flex-col md:flex">
					<DangerousPositionsAmount data={data} />
				</p>
				<CSVDownloadButton
					onClick={async () => {
						const csvString = await getLiquidationsCsvData(data.symbol)
						download(`${data.symbol}-all-positions.csv`, csvString)
					}}
					smol
					className="mt-auto mr-auto"
				/>
			</div>
			<div className="col-span-2 flex min-h-[458px] flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="flex flex-wrap items-center gap-4">
					<StackBySwitch />
					<CurrencyToggle symbol={data.symbol} />
					<CumulativeToggle />
				</div>
				<button
					onClick={() => setBobo(!bobo)}
					className="absolute -bottom-9 left-0 z-1 xl:top-0 xl:right-0 xl:bottom-[initial] xl:left-[initial]"
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
		<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form) max-sm:w-full">
			<button
				data-active={!isLiqsUsingUsd}
				onClick={() => toggleLiqsSettings(LIQS_USING_USD)}
				className="inline-flex shrink-0 items-center justify-center px-3 py-[6px] whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
			>
				{props.symbol.toUpperCase()}
			</button>
			<button
				data-active={isLiqsUsingUsd}
				onClick={() => toggleLiqsSettings(LIQS_USING_USD)}
				className="inline-flex shrink-0 items-center justify-center px-3 py-[6px] whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
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
			<span className="font-jetbrains text-2xl font-semibold">${getReadableValue(dangerousPositionsAmount)}</span>
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
			<p className="-mt-4 flex flex-nowrap items-center justify-end gap-1 italic opacity-60">
				<Icon name="clock" height={12} width={12} />
				<span suppressHydrationWarning>Last updated {minutesAgo}min ago</span>
			</p>
		</>
	)
}
