import * as React from 'react'
import { OverviewTable } from '~/containers/DimensionAdapters/Table'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { AdaptorsSearch } from '~/components/Search/Adaptors'
import { groupProtocolsByParent, IOverviewProps } from '~/api/categories/adaptors'
import { ChainByAdapterChart } from './charts/ChainChart'
import { useRouter } from 'next/router'
import { formattedNum, slug } from '~/utils'
import { Announcement } from '~/components/Announcement'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { QuestionHelper } from '~/components/QuestionHelper'
import { VOLUME_TYPE_ADAPTORS } from './constants'
import { ChainOverviewMetrics } from '../ChainOverview/Metrics'

export type IOverviewContainerProps = IOverviewProps

export function ChainByAdapter(props: IOverviewContainerProps) {
	const chain = props.chain ?? 'All'
	const isSimpleFees = props.isSimpleFees
	const router = useRouter()

	const [enabledSettings] = useLocalStorageSettingsManager('fees')

	const { selectedCategories, protocolsList, rowLinks } = React.useMemo(() => {
		const selectedCategories = router.query.category
			? typeof router.query.category === 'string'
				? [router.query.category]
				: router.query.category
			: []

		const categoriesToFilter = selectedCategories.filter((c) => c.toLowerCase() !== 'all' && c.toLowerCase() !== 'none')

		const protocolsList = groupProtocolsByParent({
			protocols:
				categoriesToFilter.length > 0
					? props.protocols.filter((p) => (p.category ? selectedCategories.includes(p.category) : false))
					: props.protocols,
			parentProtocols: props.parentProtocols ?? [],
			type: props.type,
			enabledSettings,
			total24h: props.total24h
		})

		const rowLinks =
			props.allChains && props.allChains.length > 0
				? ['All', ...props.allChains].map((chain) => ({
						label: chain,
						to:
							chain === 'All'
								? `/${props.type}/${isSimpleFees ? 'simple' : ''}`
								: `/${props.type}${isSimpleFees ? '/simple' : ''}/chains/${slug(chain)}`
				  }))
				: null

		return { selectedCategories, protocolsList, rowLinks }
	}, [
		router.query.category,
		props.protocols,
		props.allChains,
		props.type,
		props.parentProtocols,
		isSimpleFees,
		enabledSettings,
		props.total24h
	])

	const isChainsPage = chain === 'all'

	const valuesExist =
		typeof props.total24h === 'number' ||
		typeof props.change_1d === 'number' ||
		typeof props.change_1m === 'number' ||
		(typeof props.dexsDominance === 'number' && props.type === 'dexs') ||
		(typeof props.change_7dover7d === 'number' && props.type === 'dexs') ||
		(typeof props.total7d === 'number' && props.type === 'dexs')
			? true
			: false

	const dataType = VOLUME_TYPE_ADAPTORS.includes(props.type) ? 'volume' : props.type

	return (
		<>
			{props.type === 'fees' && (
				<Announcement notCancellable>
					<span>Are we missing any protocol?</span>{' '}
					<a
						href="https://airtable.com/shrtBA9lvj6E036Qx"
						className="text-[var(--blue)] underline font-medium"
						target="_blank"
						rel="noopener noreferrer"
					>
						Request it here!
					</a>
				</Announcement>
			)}
			<AdaptorsSearch type={props.type} />

			<ChainOverviewMetrics currentMetric={props.type} />

			{rowLinks ? (
				<RowLinksWithDropdown links={rowLinks} activeLink={chain} key={'row links wrapper of ' + props.type} />
			) : (
				<></>
			)}

			{props.type != 'fees' ? (
				<div className={`grid grid-cols-2 ${valuesExist ? 'xl:grid-cols-3' : ''} relative isolate gap-1`}>
					{valuesExist ? (
						<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
							{!Number.isNaN(props.total24h) ? (
								<p className="flex flex-col">
									<span className="text-[#545757] dark:text-[#cccccc]">Total {dataType} (24h)</span>
									<span className="font-semibold text-2xl font-jetbrains">{formattedNum(props.total24h, true)}</span>
								</p>
							) : null}
							{props.type === 'dexs' && !Number.isNaN(props.total7d) ? (
								<p className="flex flex-col">
									<span className="text-[#545757] dark:text-[#cccccc]">Total {dataType} (7d)</span>
									<span className="font-semibold text-2xl font-jetbrains">{formattedNum(props.total7d, true)}</span>
								</p>
							) : null}
							{props.type === 'dexs' && !Number.isNaN(props.change_7dover7d) ? (
								<p className="hidden md:flex flex-col">
									<span className="flex items-center gap-1 text-[#545757] dark:text-[#cccccc]">
										<span>Weekly change</span>
										<QuestionHelper text={`Change of last 7d volume over the previous 7d volume of all dexs`} />
									</span>
									{props.change_7dover7d > 0 ? (
										<span className="font-semibold text-2xl font-jetbrains">{props.change_7dover7d || 0}%</span>
									) : (
										<span className="font-semibold text-2xl font-jetbrains">{props.change_7dover7d || 0}%</span>
									)}
								</p>
							) : null}
							{props.type !== 'dexs' && !Number.isNaN(props.change_1d) ? (
								<p className="hidden md:flex flex-col">
									<span className="text-[#545757] dark:text-[#cccccc]">Change (24h)</span>
									{props.change_1d > 0 ? (
										<span className="font-semibold text-2xl font-jetbrains">{props.change_1d || 0}%</span>
									) : (
										<span className="font-semibold text-2xl font-jetbrains">{props.change_1d || 0}%</span>
									)}
								</p>
							) : null}
							{props.type === 'dexs' && !Number.isNaN(props.dexsDominance) ? (
								<>
									{!props.chain && (
										<p className="hidden md:flex flex-col">
											<span className="flex items-center gap-1 text-[#545757] dark:text-[#cccccc]">
												<span>DEX vs CEX dominance</span>
												<QuestionHelper text={`Dexs dominance over aggregated dexs and cexs volume (24h)`} />
											</span>
											<span className="font-semibold text-2xl font-jetbrains">{props.dexsDominance || 0}%</span>
										</p>
									)}
								</>
							) : !Number.isNaN(props.change_1m) ? (
								<p className="hidden md:flex flex-col">
									<span className="text-[#545757] dark:text-[#cccccc]">Change (30d)</span>
									<span className="font-semibold text-2xl font-jetbrains">{props.change_1m || 0}%</span>
								</p>
							) : null}
						</div>
					) : (
						<></>
					)}

					<ChainByAdapterChart totalDataChart={props.totalDataChart} />
				</div>
			) : null}

			{protocolsList && protocolsList.length > 0 ? (
				<OverviewTable
					isSimpleFees={props.isSimpleFees}
					data={protocolsList}
					type={props.type}
					allChains={isChainsPage}
					categories={props.categories}
					selectedCategories={selectedCategories}
				/>
			) : (
				<p className="p-5 bg-[var(--cards-bg)] rounded-md text-center">
					{`Looks like we couldn't find any protocol👀. 🦙🦙🦙 are working on it.`}
				</p>
			)}
		</>
	)
}
