import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { useTeam } from './useTeam'

export function TeamInfoCard() {
	const { team, isAdmin, updateTeamMutation } = useTeam()
	const [isEditing, setIsEditing] = useState(false)
	const [editName, setEditName] = useState('')

	if (!team) return null

	const handleSave = async () => {
		if (!editName.trim()) return
		await updateTeamMutation.mutateAsync({ name: editName.trim() })
		setIsEditing(false)
	}

	const startEditing = () => {
		setEditName(team.name)
		setIsEditing(true)
	}

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			<div className="flex items-center gap-2">
				<Icon name="users" height={28} width={28} className="text-(--sub-ink-primary) dark:text-white" />
				<span className="text-base leading-5 font-medium text-(--sub-ink-primary) dark:text-white">Team</span>
			</div>

			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<span className="shrink-0 text-xs leading-4 text-(--sub-text-muted)">Name</span>
					<div className="h-0 min-w-0 flex-1 border-b border-dashed border-(--sub-border-slate-100) dark:border-(--sub-border-strong)" />
					{isEditing ? (
						<div className="flex items-center gap-2">
							<input
								type="text"
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') void handleSave()
									if (e.key === 'Escape') setIsEditing(false)
								}}
								className="w-40 rounded border border-(--sub-border-slate-100) bg-white px-2 py-1 text-xs text-(--sub-ink-primary) focus:border-(--sub-brand-primary) focus:outline-hidden dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark) dark:text-white"
								autoFocus
							/>
							<button
								onClick={() => void handleSave()}
								disabled={!editName.trim() || updateTeamMutation.isPending}
								className="text-xs font-medium text-(--sub-brand-primary) disabled:opacity-50"
							>
								{updateTeamMutation.isPending ? '...' : 'Save'}
							</button>
							<button onClick={() => setIsEditing(false)} className="text-xs text-(--sub-text-muted)">
								Cancel
							</button>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<span className="shrink-0 text-xs leading-4 text-(--sub-ink-primary) dark:text-white">{team.name}</span>
							{isAdmin && (
								<button
									onClick={startEditing}
									className="text-(--sub-text-muted) transition-colors hover:text-(--sub-ink-primary) dark:hover:text-white"
								>
									<Icon name="pencil" height={14} width={14} />
								</button>
							)}
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					<span className="shrink-0 text-xs leading-4 text-(--sub-text-muted)">Your role</span>
					<div className="h-0 min-w-0 flex-1 border-b border-dashed border-(--sub-border-slate-100) dark:border-(--sub-border-strong)" />
					<span className="shrink-0 text-xs leading-4 text-(--sub-ink-primary) dark:text-white">
						{team.isAdmin ? 'Admin' : 'Member'}
					</span>
				</div>
			</div>
		</div>
	)
}
