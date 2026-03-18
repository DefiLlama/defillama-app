import { createColumnHelper } from '@tanstack/react-table'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems, toTokenIconItems, yieldsChainHref, yieldsProjectHref } from '~/components/IconsRow/utils'
import { ImageWithFallback } from '~/components/ImageWithFallback'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { formattedNum } from '~/utils'
import { NameYield, NameYieldPool } from '~/containers/Yields/Tables/Name'
import { YieldsTableWrapper } from '~/containers/Yields/Tables/shared'
import { StabilityCell, StabilityHeader } from '~/containers/Yields/Tables/StabilityCell'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'

const columnHelper = createColumnHelper<IYieldTableRow>()

const columns = [
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
		size: 200
	}),
	columnHelper.accessor('project', {
		id: 'project',
		header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
		enableSorting: false,
		cell: ({ row }) => (
			<NameYield project={row.original.project} projectslug={row.original.projectslug} />
		),
		size: 200
	}),
	columnHelper.accessor('chains', {
		id: 'chains',
		header: 'Chain',
		enableSorting: false,
		cell: (info) => <IconsRow items={toChainIconItems(info.getValue(), (chain) => yieldsChainHref(chain))} />,
		meta: { align: 'end' },
		size: 60
	}),
	columnHelper.accessor('tvl', {
		id: 'tvl',
		header: 'TVL',
		enableSorting: true,
		cell: (info) => <span>{formattedNum(info.getValue(), true)}</span>,
		size: 120,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('apy', {
		id: 'apy',
		header: 'APY',
		enableSorting: true,
		cell: (info) => <PercentChange percent={info.getValue()} noSign fontWeight={700} />,
		size: 100,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('apyBase', {
		id: 'apyBase',
		header: 'Base APY',
		enableSorting: true,
		cell: (info) => <PercentChange percent={info.getValue()} noSign />,
		size: 140,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('apyReward', {
		id: 'apyReward',
		header: 'Reward APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const rewards = row.original.rewards ?? []
			return (
				<div className="flex w-full items-center justify-end gap-1">
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
				</div>
			)
		},
		size: 140,
		meta: { align: 'end' }
	}),
	columnHelper.accessor((row) => (row as any).apyMean30d as number | null, {
		id: 'apyMean30d',
		header: '30d Avg APY',
		enableSorting: true,
		cell: (info) => <PercentChange percent={info.getValue()} noSign />,
		size: 125,
		meta: { align: 'end' }
	}),
	columnHelper.accessor((row) => row.cv30d ?? undefined, {
		id: 'cv30d',
		header: () => <StabilityHeader />,
		enableSorting: true,
		cell: ({ getValue, row }) => (
			<StabilityCell
				cv30d={getValue() as number | null}
				apyMedian30d={row.original.apyMedian30d}
				apyStd30d={row.original.apyStd30d}
			/>
		),
		size: 110,
		meta: { align: 'end' }
	}),
	columnHelper.accessor((row) => (row as any).apyChart30d as string | null | undefined, {
		id: 'apyChart30d',
		header: '30d APY Chart',
		enableSorting: false,
		cell: ({ row }) => {
			const configID = row.original.configID
			if (!configID) return null
			return (
				<BasicLink href={`/yields/pool/${configID}`} target="_blank" className="text-sm font-medium text-(--link-text)">
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
		size: 125,
		meta: { align: 'end' }
	})
]

const COL_IDS = ['pool', 'project', 'chains', 'tvl', 'apy', 'apyBase', 'apyReward', 'apyMean30d', 'cv30d', 'apyChart30d']

const columnOrders: ColumnOrdersByBreakpoint = {
	0: ['pool', 'apy', 'tvl', 'project', 'chains', 'apyBase', 'apyReward', 'apyMean30d', 'cv30d', 'apyChart30d'],
	400: ['pool', 'project', 'apy', 'tvl', 'chains', 'apyBase', 'apyReward', 'apyMean30d', 'cv30d', 'apyChart30d'],
	640: ['pool', 'project', 'tvl', 'apy', 'chains', 'apyBase', 'apyReward', 'apyMean30d', 'cv30d', 'apyChart30d'],
	1280: COL_IDS
}

const columnSizes: ColumnSizesByBreakpoint = {
	0: { pool: 120, project: 200, chains: 60, tvl: 120, apy: 100, apyBase: 140, apyReward: 140, apyMean30d: 125, cv30d: 110, apyChart30d: 125 },
	812: { pool: 200, project: 200, chains: 60, tvl: 120, apy: 100, apyBase: 140, apyReward: 140, apyMean30d: 125, cv30d: 110, apyChart30d: 125 },
	1280: { pool: 240, project: 200, chains: 60, tvl: 120, apy: 100, apyBase: 140, apyReward: 140, apyMean30d: 125, cv30d: 110, apyChart30d: 125 }
}

const COMPACT_COL_IDS = ['pool', 'project', 'chains', 'tvl', 'apy']

const compactColumnOrders: ColumnOrdersByBreakpoint = {
	0: ['pool', 'apy', 'tvl', 'project', 'chains'],
	400: ['pool', 'project', 'apy', 'tvl', 'chains'],
	640: COMPACT_COL_IDS
}

const compactColumnSizes: ColumnSizesByBreakpoint = {
	0: { pool: 160, project: 200, chains: 36, tvl: 90, apy: 70 },
	640: { pool: 220, project: 220, chains: 36, tvl: 90, apy: 70 }
}

export function RWAYieldsTable({ data, compact }: { data: IYieldTableRow[]; compact?: boolean }) {
	return (
		<YieldsTableWrapper
			data={data}
			columns={compact ? columns.filter((c) => COMPACT_COL_IDS.includes(c.id!)) : columns}
			columnSizes={compact ? compactColumnSizes : columnSizes}
			columnOrders={compact ? compactColumnOrders : columnOrders}
			sortingState={[{ id: 'tvl', desc: true }]}
		/>
	)
}
