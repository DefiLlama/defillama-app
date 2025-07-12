import React from 'react'

type TableSkeletonProps = {
	columns?: number
	rows?: number
	className?: string
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ columns = 7, rows = 10, className = '' }) => (
	<div className={`w-full ${className}`} aria-busy="true" aria-label="Loading table">
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
				<thead>
					<tr>
						{Array.from({ length: columns }).map((_, i) => (
							<th key={i} className="px-4 py-2">
								<div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20 animate-pulse" />
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{Array.from({ length: rows }).map((_, rowIdx) => (
						<tr key={rowIdx} className="even:bg-neutral-50 dark:even:bg-neutral-800">
							{Array.from({ length: columns }).map((_, colIdx) => (
								<td key={colIdx} className="px-4 py-3">
									<div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full animate-pulse" />
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	</div>
)
