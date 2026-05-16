import * as Ariakit from '@ariakit/react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useMoveSessionToProject, useProjectList } from './hooks'

interface MoveToProjectMenuItemProps {
	sessionId: string
	currentProjectId?: string | null
}

const MENU_ITEM_CLASS =
	'flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden px-3 py-2 text-ellipsis whitespace-nowrap cv-auto-37 hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)'
const PARENT_ITEM_CLASS = `${MENU_ITEM_CLASS} border-b border-(--form-control-border) first-of-type:rounded-t-md last-of-type:rounded-b-md aria-disabled:cursor-not-allowed aria-disabled:opacity-60`

export function MoveToProjectMenuItem({ sessionId, currentProjectId = null }: MoveToProjectMenuItemProps) {
	const projects = useProjectList()
	const move = useMoveSessionToProject()

	const onMove = async (projectId: string | null) => {
		if (projectId === currentProjectId) return

		try {
			await move.mutateAsync({ sessionId, projectId, previousProjectId: currentProjectId })
			toast.success(projectId ? 'Moved to project' : 'Removed from project')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to move session')
		}
	}

	return (
		<Ariakit.MenuProvider>
			<Ariakit.MenuItem render={<Ariakit.MenuButton />} className={PARENT_ITEM_CLASS}>
				<Icon name="folder-plus" height={14} width={14} className="shrink-0" />
				<span className="flex-1 text-left">Move to project</span>
				<Icon name="chevron-right" height={12} width={12} className="shrink-0 opacity-60" />
			</Ariakit.MenuItem>
			<Ariakit.Menu
				portal
				unmountOnHide
				gutter={4}
				className="z-50 flex thin-scrollbar max-h-[300px] min-w-[200px] flex-col overflow-auto rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) text-(--text-primary) dark:border-[hsl(204,3%,32%)]"
			>
				{projects.isLoading ? (
					<div className="flex items-center justify-center px-3 py-2">
						<LoadingSpinner size={12} />
					</div>
				) : projects.isError ? (
					<div className="flex flex-col gap-1 px-3 py-2 text-xs text-[#666] dark:text-[#919296]">
						<span>Failed to load projects</span>
						<button type="button" onClick={() => void projects.refetch()} className="self-start text-(--old-blue)">
							Retry
						</button>
					</div>
				) : !projects.data || projects.data.length === 0 ? (
					<div className="px-3 py-2 text-xs text-[#666] dark:text-[#919296]">No projects yet</div>
				) : (
					<>
						{projects.data.map((p) => {
							const isCurrentProject = p.id === currentProjectId
							return (
								<Ariakit.MenuItem
									key={p.id}
									onClick={() => void onMove(p.id)}
									disabled={isCurrentProject || move.isPending}
									className={`${MENU_ITEM_CLASS} aria-disabled:cursor-not-allowed aria-disabled:opacity-60`}
								>
									<Icon
										name={isCurrentProject ? 'check' : 'folder-plus'}
										height={14}
										width={14}
										className="shrink-0 opacity-70"
									/>
									<span className="min-w-0 flex-1 truncate text-left">{p.name}</span>
								</Ariakit.MenuItem>
							)
						})}
						{currentProjectId ? (
							<Ariakit.MenuItem
								onClick={() => void onMove(null)}
								disabled={move.isPending}
								className={`${MENU_ITEM_CLASS} border-t border-(--form-control-border) aria-disabled:cursor-not-allowed aria-disabled:opacity-60`}
							>
								<Icon name="x" height={14} width={14} className="shrink-0 opacity-70" />
								<span className="min-w-0 flex-1 truncate text-left">Remove from project</span>
							</Ariakit.MenuItem>
						) : null}
					</>
				)}
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}
