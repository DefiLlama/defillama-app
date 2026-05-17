import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { useTeam } from './useTeam'

export function CreateTeamCard() {
	const { createTeamMutation } = useTeam()
	const [isCreating, setIsCreating] = useState(false)
	const [teamName, setTeamName] = useState('')

	const handleCreate = async () => {
		if (!teamName.trim()) return
		await createTeamMutation.mutateAsync({ name: teamName.trim() })
		setTeamName('')
		setIsCreating(false)
	}

	return (
		<div className="flex flex-col items-center gap-6 rounded-2xl border border-(--sub-border-slate-100) bg-white p-8 text-center dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			<div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--sub-brand-primary)/10">
				<Icon name="users" height={32} width={32} className="text-(--sub-brand-primary)" />
			</div>
			<div className="flex flex-col gap-2">
				<h2 className="text-lg font-semibold text-(--sub-ink-primary) dark:text-white">Team Management</h2>
				<p className="max-w-sm text-sm text-(--sub-text-muted)">
					Create a team to manage subscriptions for your organization. Purchase seats and invite members.
				</p>
			</div>

			{isCreating ? (
				<div className="flex w-full max-w-xs flex-col gap-3">
					<input
						type="text"
						placeholder="Team name"
						value={teamName}
						onChange={(e) => setTeamName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') void handleCreate()
						}}
						className="w-full rounded-lg border border-(--sub-border-slate-100) bg-white px-3 py-2 text-sm text-(--sub-ink-primary) placeholder:text-(--sub-text-muted) focus:border-(--sub-brand-primary) focus:ring-1 focus:ring-(--sub-brand-primary) focus:outline-hidden dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark) dark:text-white"
						autoFocus
					/>
					<div className="flex gap-2">
						<button
							onClick={() => void handleCreate()}
							disabled={!teamName.trim() || createTeamMutation.isPending}
							className="flex h-9 flex-1 items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white disabled:opacity-50"
						>
							{createTeamMutation.isPending ? 'Creating...' : 'Create'}
						</button>
						<button
							onClick={() => {
								setIsCreating(false)
								setTeamName('')
							}}
							className="flex h-9 flex-1 items-center justify-center rounded-lg border border-(--sub-border-muted) text-sm font-medium text-(--sub-ink-primary) dark:border-(--sub-border-strong) dark:text-white"
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<button
					onClick={() => setIsCreating(true)}
					className="flex h-10 items-center gap-2 rounded-lg bg-(--sub-brand-primary) px-5 text-sm font-medium text-white"
				>
					<Icon name="plus" height={16} width={16} />
					Create Team
				</button>
			)}
		</div>
	)
}
