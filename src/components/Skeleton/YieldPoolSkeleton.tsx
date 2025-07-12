import React from 'react'
import { StatCardSkeleton } from './StatCardSkeleton'
import { ChartSkeleton } from './ChartSkeleton'
import { RiskRatingSkeleton } from './RiskRatingSkeleton'
import { InfoBlockSkeleton } from './InfoBlockSkeleton'

export const YieldPoolSkeleton: React.FC = () => (
	<div className="flex flex-col gap-4 w-full" aria-busy="true" aria-label="Loading yield pool page">
		{/* Header and Stats */}
		<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
			<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 col-span-2 w-full xl:col-span-1 overflow-x-auto p-5">
				{/* Title */}
				<div className="h-7 bg-neutral-200 dark:bg-neutral-700 rounded w-40 animate-pulse mb-2" />
				{/* Stats Row */}
				<div className="flex items-end justify-between flex-wrap gap-5 relative">
					<StatCardSkeleton />
					<StatCardSkeleton />
					<StatCardSkeleton />
				</div>
				{/* TVL */}
				<div className="flex flex-col gap-1">
					<div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-32 animate-pulse" />
					<div className="min-h-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-24 animate-pulse" />
				</div>
				{/* Risk */}
				<RiskRatingSkeleton />
				{/* Outlook */}
				<div className="flex flex-col gap-1">
					<div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-16 animate-pulse" />
					<div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-full animate-pulse" />
				</div>
			</div>
			{/* Main Chart */}
			<div className="bg-[var(--cards-bg)] rounded-md col-span-2 flex flex-col justify-center items-center">
				<ChartSkeleton />
			</div>
		</div>
		{/* Risk Section */}
		<div className="grid grid-cols-2 gap-1 rounded-md bg-[var(--cards-bg)]">
			<div className="flex flex-col col-span-2 xl:col-span-1 p-5">
				<div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-48 mb-6 animate-pulse" />
				<RiskRatingSkeleton />
			</div>
		</div>
		{/* Borrow/Net APY/Pool Liquidity Charts */}
		<div className="grid grid-cols-2 gap-1 rounded-md bg-[var(--cards-bg)]">
			<ChartSkeleton minHeight="h-[400px]" />
			<ChartSkeleton minHeight="h-[400px]" />
		</div>
		{/* Protocol Info */}
		<InfoBlockSkeleton />
	</div>
)
