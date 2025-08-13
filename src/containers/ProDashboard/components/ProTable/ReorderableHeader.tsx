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

export function ReorderableHeader({
	children,
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
		<div className="flex items-center gap-1 w-full group cursor-pointer relative" onClick={onSort}>
			{onMoveUp && (
				<div
					className={`absolute left-0 top-0 bottom-0 flex items-center justify-start ${
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
							className="p-0.5 hover:bg-(--bg-tertiary) rounded-sm transition-colors"
							title="Swap with left column"
						>
							<Icon name="chevron-left" height={10} width={10} />
						</button>
					)}
				</div>
			)}

			<div className="flex items-center gap-1 flex-1 justify-center px-3">
				{children}
				{canSort && <SortIcon dir={isSorted} />}
			</div>

			{onMoveDown && (
				<div
					className={`absolute right-0 top-0 bottom-0 flex items-center justify-end ${
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
							className="p-0.5 hover:bg-(--bg-tertiary) rounded-sm transition-colors"
							title="Swap with right column"
						>
							<Icon name="chevron-right" height={10} width={10} />
						</button>
					)}
				</div>
			)}
		</div>
	)
}
