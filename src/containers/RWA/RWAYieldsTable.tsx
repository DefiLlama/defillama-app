import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems, toTokenIconItems, yieldsChainHref, yieldsProjectHref } from '~/components/IconsRow/utils'
import { ImageWithFallback } from '~/components/ImageWithFallback'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import type { ColumnOrdersByBreakpoint } from '~/components/Table/utils'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useVolatility } from '~/containers/Yields/queries/client'
import { NameYield, NameYieldPool } from '~/containers/Yields/Tables/Name'
import { YieldsTableWrapper } from '~/containers/Yields/Tables/shared'
import { StabilityCell, StabilityHeader } from '~/containers/Yields/Tables/StabilityCell'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { useYieldsUpgradePrompt } from '~/containers/Yields/Tables/useYieldsUpgradePrompt'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { useIsClient } from '~/hooks/useIsClient'
import { formattedNum } from '~/utils'

const columnHelper = createColumnHelper<IYieldTableRow>()

function createColumns({
	hasPremiumAccess,
	onRequestUpgrade,
	compact = false
}: {
	hasPremiumAccess: boolean
	onRequestUpgrade: (source: 'header' | 'cell') => void
	compact?: boolean
}) {
	return [
		columnHelper.accessor('pool', {
			id: 'pool',
			header: 'Pool',
			enableSorting: false,
			cell: ({ getValue, row }) => (
				<NameYieldPool
					value={getValue()}
					configID={row.original.configID}
					url={row.original.url}
					poolMeta={row.original.poolMeta}
				/>
			),
			meta: {
				headerClassName: compact ? 'w-[160px] sm:w-[220px]' : 'w-[120px] min-[812px]:w-[200px] xl:w-[240px]'
			}
		}),
		columnHelper.accessor('project', {
			id: 'project',
			header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
			enableSorting: false,
			cell: ({ row }) => <NameYield project={row.original.project} projectslug={row.original.projectslug} />,
			meta: {
				headerClassName: compact ? 'w-[140px] sm:w-[220px]' : 'w-[200px]'
			}
		}),
		columnHelper.accessor('chains', {
			id: 'chains',
			header: 'Chain',
			enableSorting: false,
			cell: (info) => <IconsRow items={toChainIconItems(info.getValue(), (chain) => yieldsChainHref(chain))} />,
			meta: {
				headerClassName: compact ? 'w-[36px]' : 'w-[60px]',
				align: 'end'
			}
		}),
		columnHelper.accessor((row) => row.tvl ?? undefined, {
			id: 'tvl',
			header: 'TVL',
			enableSorting: true,
			cell: (info) => <span>{formattedNum(info.getValue(), true)}</span>,
			meta: {
				headerClassName: compact ? 'w-[90px]' : 'w-[120px]',
				align: 'end'
			}
		}),
		columnHelper.accessor((row) => row.apy ?? undefined, {
			id: 'apy',
			header: 'APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign fontWeight={700} />,
			meta: {
				headerClassName: compact ? 'w-[90px] sm:w-[70px]' : 'w-[100px]',
				align: 'end'
			}
		}),
		columnHelper.accessor((row) => row.apyBase ?? undefined, {
			id: 'apyBase',
			header: 'Base APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			meta: {
				headerClassName: 'w-[140px]',
				align: 'end'
			}
		}),
		columnHelper.accessor((row) => row.apyReward ?? undefined, {
			id: 'apyReward',
			header: 'Reward APY',
			enableSorting: true,
			cell: ({ getValue, row }) => {
				const rewards = row.original.rewards ?? []
				return (
					<span className="inline-flex items-center gap-1">
						{lockupsRewards.includes(row.original.project) ? (
							<QuestionHelper text={earlyExit} />
						) : row.original.rewardMeta ? (
							<QuestionHelper text={row.original.rewardMeta} />
						) : null}
						<IconsRow
							items={toTokenIconItems(rewards, {
								titles: row.original.rewardTokensSymbols,
								getHref: (reward) => yieldsProjectHref(reward)
							})}
						/>
						<PercentChange percent={getValue()} noSign />
					</span>
				)
			},
			meta: {
				headerClassName: 'w-[140px]',
				align: 'end'
			}
		}),
		columnHelper.accessor((row) => row.apyMean30d ?? undefined, {
			id: 'apyMean30d',
			header: '30d Avg APY',
			enableSorting: true,
			cell: (info) => <PercentChange percent={info.getValue()} noSign />,
			meta: {
				headerClassName: 'w-[125px]',
				align: 'end'
			}
		}),
		columnHelper.accessor((row) => row.cv30d ?? undefined, {
			id: 'cv30d',
			header: () => <StabilityHeader hasPremiumAccess={hasPremiumAccess} onRequestUpgrade={onRequestUpgrade} />,
			enableSorting: hasPremiumAccess,
			cell: ({ getValue, row }) => (
				<StabilityCell
					cv30d={getValue() as number | null}
					apyMedian30d={row.original.apyMedian30d}
					apyStd30d={row.original.apyStd30d}
					hasPremiumAccess={hasPremiumAccess}
					onRequestUpgrade={onRequestUpgrade}
				/>
			),
			meta: {
				headerClassName: 'w-[110px]',
				align: 'end'
			}
		}),
		columnHelper.accessor((row) => row.apyChart30d ?? undefined, {
			id: 'apyChart30d',
			header: '30d APY Chart',
			enableSorting: false,
			cell: ({ row }) => {
				const configID = row.original.configID
				if (!configID) return null
				return (
					<BasicLink
						href={`/yields/pool/${configID}`}
						target="_blank"
						className="text-sm font-medium text-(--link-text)"
					>
						<ImageWithFallback
							src={`https://yield-charts.llama.fi/yield-chart/${configID}`}
							alt=""
							width={90}
							height={30}
							className="ml-auto"
						/>
					</BasicLink>
				)
			},
			meta: {
				headerClassName: 'w-[125px]',
				align: 'end'
			}
		})
	]
}

const COL_IDS = [
	'pool',
	'project',
	'chains',
	'tvl',
	'apy',
	'apyBase',
	'apyReward',
	'apyMean30d',
	'cv30d',
	'apyChart30d'
]

const columnOrders: ColumnOrdersByBreakpoint = {
	0: ['pool', 'apy', 'tvl', 'project', 'chains', 'apyBase', 'apyReward', 'apyMean30d', 'cv30d', 'apyChart30d'],
	400: ['pool', 'project', 'apy', 'tvl', 'chains', 'apyBase', 'apyReward', 'apyMean30d', 'cv30d', 'apyChart30d'],
	640: ['pool', 'project', 'tvl', 'apy', 'chains', 'apyBase', 'apyReward', 'apyMean30d', 'cv30d', 'apyChart30d'],
	1280: COL_IDS
}
const COMPACT_COL_IDS = ['pool', 'project', 'chains', 'tvl', 'apy']

const compactColumnOrders: ColumnOrdersByBreakpoint = {
	0: ['pool', 'apy', 'tvl', 'project', 'chains'],
	400: ['pool', 'project', 'apy', 'tvl', 'chains'],
	640: COMPACT_COL_IDS
}
export function RWAYieldsTable({ data, compact }: { data: IYieldTableRow[]; compact?: boolean }) {
	const isClient = useIsClient()
	const { hasActiveSubscription } = useAuthContext()
	const { data: volatility } = useVolatility()
	const { onRequestUpgrade, modal } = useYieldsUpgradePrompt()
	const hasPremiumAccess = isClient && hasActiveSubscription
	const rows = useMemo(
		() =>
			data.map((row) => {
				const volatilityEntry = row.configID ? volatility?.[row.configID] : undefined
				return {
					...row,
					apyMedian30d: row.apyMedian30d ?? volatilityEntry?.[1] ?? null,
					apyStd30d: row.apyStd30d ?? volatilityEntry?.[2] ?? null,
					cv30d: row.cv30d ?? volatilityEntry?.[3] ?? null
				}
			}),
		[data, volatility]
	)
	const columns = useMemo(
		() => createColumns({ hasPremiumAccess, onRequestUpgrade, compact }),
		[hasPremiumAccess, onRequestUpgrade, compact]
	)

	return (
		<>
			<YieldsTableWrapper
				data={rows}
				columns={compact ? columns.filter((c) => COMPACT_COL_IDS.includes(c.id!)) : columns}
				columnOrders={compact ? compactColumnOrders : columnOrders}
				sortingState={[{ id: 'tvl', desc: true }]}
				skipVirtualization
			/>
			{modal}
		</>
	)
}
