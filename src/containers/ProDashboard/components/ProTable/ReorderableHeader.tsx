'use no memo'

import * as React from 'react'
import { Icon } from '~/components/Icon'
import { SortIcon } from '~/components/Table/SortIcon'

interface ReorderableHeaderProps {
	children: React.ReactNode
	columnId: string
	canSort: boolean
	isSorted: false | 'asc' | 'desc'
	onSort: () => void
	onMoveUp?: () => void
	onMoveDown?: () => void
	canMoveUp?: boolean
	canMoveDown?: boolean
}

export const ReorderableHeader = React.memo(function ReorderableHeader({
	children,
	// oxlint-disable-next-line no-unused-vars
	columnId,
	canSort,
	isSorted,
	onSort,
	onMoveUp,
	onMoveDown,
	canMoveUp = true,
	canMoveDown = true
}: ReorderableHeaderProps) {
	return (
			<div
				className={`group relative flex w-full items-center gap-1 ${canSort ? 'cursor-pointer' : 'cursor-default'}`}
				onClick={canSort ? onSort : undefined}
				role="button"
				tabIndex={canSort ? 0 : -1}
				aria-disabled={!canSort}
				onKeyDown={(event) => {
					if (!canSort) return
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()
						onSort()
					}
				}}
			>
			{onMoveUp && (
				<div
					className={`absolute top-0 bottom-0 left-0 flex items-center justify-start ${
						canMoveUp ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
					} transition-opacity`}
					style={{ marginLeft: '-8px' }}
				>
					{canMoveUp && (
						<button
							onClick={(e) => {
								e.stopPropagation()
								onMoveUp()
							}}
							className="rounded-md p-0.5 transition-colors hover:bg-(--bg-tertiary)"
							title="Swap with left column"
						>
							<Icon name="chevron-left" height={10} width={10} />
						</button>
					)}
				</div>
			)}

			<div className="flex flex-1 items-center justify-center gap-1 px-3">
				{children}
				{canSort && <SortIcon dir={isSorted} />}
			</div>

			{onMoveDown && (
				<div
					className={`absolute top-0 right-0 bottom-0 flex items-center justify-end ${
						canMoveDown ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
					} transition-opacity`}
					style={{ marginRight: '-8px' }}
				>
					{canMoveDown && (
						<button
							onClick={(e) => {
								e.stopPropagation()
								onMoveDown()
							}}
							className="rounded-md p-0.5 transition-colors hover:bg-(--bg-tertiary)"
							title="Swap with right column"
						>
							<Icon name="chevron-right" height={10} width={10} />
						</button>
					)}
				</div>
			)}
		</div>
	)
})
