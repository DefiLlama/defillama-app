import { useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import { ConfirmActionModal } from './ConfirmActionModal'
import { InviteMemberModal } from './InviteMemberModal'
import type { TeamInvite } from './types'
import { useTeam } from './useTeam'

const RESEND_COOLDOWN_MS = 60_000

function formatDate(dateStr: string): string {
	const date = new Date(dateStr)
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function InviteRow({ invite }: { invite: TeamInvite }) {
	const { revokeInviteMutation, resendInviteMutation } = useTeam()
	const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
	const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
	const [now, setNow] = useState(() => Date.now())

	useEffect(() => {
		if (!cooldownUntil) return
		const tick = () => setNow(Date.now())
		const id = window.setInterval(tick, 1000)
		return () => window.clearInterval(id)
	}, [cooldownUntil])

	const remainingMs = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0
	const remainingSeconds = Math.ceil(remainingMs / 1000)
	const onCooldown = remainingMs > 0
	const isResending = resendInviteMutation.isPending && resendInviteMutation.variables?.inviteId === invite.id

	const handleResend = () => {
		if (onCooldown || isResending) return
		void resendInviteMutation.mutateAsync({ inviteId: invite.id }).then(() => {
			setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS)
		})
	}

	const isExpired = new Date(invite.expiresAt) < new Date()

	return (
		<>
			<div className="flex items-center gap-3 rounded-lg border border-(--sub-border-slate-100) p-3 dark:border-(--sub-border-strong)">
				<div className="min-w-0 flex-1">
					<span className="truncate text-sm text-(--sub-ink-primary) dark:text-white">{invite.email}</span>
					<div className="mt-1 flex items-center gap-2">
						<span className={`text-xs ${isExpired ? 'text-(--error)' : 'text-(--sub-text-muted)'}`}>
							{isExpired ? 'Expired' : `Expires ${formatDate(invite.expiresAt)}`}
						</span>
					</div>
				</div>
				<button
					onClick={handleResend}
					disabled={onCooldown || isResending}
					className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-(--sub-border-muted) px-2 text-xs font-medium text-(--sub-text-muted) transition-colors hover:border-(--sub-brand-primary) hover:text-(--sub-brand-primary) disabled:cursor-not-allowed disabled:opacity-50 dark:border-(--sub-border-strong)"
					title={onCooldown ? `Wait ${remainingSeconds}s to resend again` : 'Resend invite'}
				>
					<Icon name="mail" height={12} width={12} />
					{isResending ? 'Sending...' : onCooldown ? `Resend in ${remainingSeconds}s` : 'Resend'}
				</button>
				<button
					onClick={() => setShowRevokeConfirm(true)}
					className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-(--sub-border-muted) px-2 text-xs font-medium text-(--sub-text-muted) transition-colors hover:border-(--error) hover:text-(--error) dark:border-(--sub-border-strong)"
					title="Revoke invite"
				>
					<Icon name="x" height={12} width={12} />
					Revoke
				</button>
			</div>

			<ConfirmActionModal
				isOpen={showRevokeConfirm}
				onClose={() => setShowRevokeConfirm(false)}
				onConfirm={() => {
					void revokeInviteMutation.mutateAsync({ inviteId: invite.id }).then(() => setShowRevokeConfirm(false))
				}}
				isLoading={revokeInviteMutation.isPending}
				title="Revoke Invite"
				description={`Are you sure you want to revoke the invite for ${invite.email}?`}
				confirmLabel="Revoke"
				confirmVariant="danger"
			/>
		</>
	)
}

export function TeamInvitesCard() {
	const { pendingInvites } = useTeam()
	const [showInviteModal, setShowInviteModal] = useState(false)

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Icon name="mail" height={20} width={20} className="text-(--sub-ink-primary) dark:text-white" />
					<span className="text-base leading-5 font-medium text-(--sub-ink-primary) dark:text-white">
						Pending Invites
					</span>
				</div>
				<button
					onClick={() => setShowInviteModal(true)}
					className="flex h-8 items-center gap-1.5 rounded-lg bg-(--sub-brand-primary) px-3 text-xs font-medium text-white"
				>
					<Icon name="plus" height={14} width={14} />
					Invite Member
				</button>
			</div>

			{pendingInvites.length === 0 ? (
				<p className="text-sm text-(--sub-text-muted)">No pending invites.</p>
			) : (
				<div className="flex flex-col gap-2">
					{pendingInvites.map((invite) => (
						<InviteRow key={invite.id} invite={invite} />
					))}
				</div>
			)}

			{showInviteModal && <InviteMemberModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />}
		</div>
	)
}
