import { Icon } from '~/components/Icon'
import { MemberRow } from './MemberRow'
import { useTeam } from './useTeam'

export function TeamMembersCard() {
	const { members } = useTeam()

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			<div className="flex items-center gap-2">
				<Icon name="users" height={20} width={20} className="text-(--sub-ink-primary) dark:text-white" />
				<span className="text-base leading-5 font-medium text-(--sub-ink-primary) dark:text-white">
					Members ({members.length})
				</span>
			</div>

			{members.length === 0 ? (
				<p className="text-sm text-(--sub-text-muted)">No members yet. Send invites to add team members.</p>
			) : (
				<div className="flex flex-col gap-2">
					{members.map((member) => (
						<MemberRow key={member.id} member={member} />
					))}
				</div>
			)}
		</div>
	)
}
