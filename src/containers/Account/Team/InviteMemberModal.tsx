import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { useTeam } from './useTeam'

interface InviteMemberModalProps {
	isOpen: boolean
	onClose: () => void
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
	const { inviteMemberMutation } = useTeam()
	const [email, setEmail] = useState('')

	const handleInvite = async () => {
		if (!email.trim()) return
		await inviteMemberMutation.mutateAsync({ email: email.trim() })
		setEmail('')
		onClose()
	}

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog
				backdrop={<div className="bg-black/80" />}
				className="dialog max-h-[90vh] min-h-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 md:max-w-[380px]"
				portal
				unmountOnHide
			>
				<div className="flex flex-col gap-5 bg-white px-5 py-6 dark:bg-(--sub-surface-dark)">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-semibold text-(--sub-ink-primary) dark:text-white">Invite Member</h2>
						<Ariakit.DialogDismiss className="rounded-full p-1 text-(--sub-text-muted) transition-colors hover:text-(--sub-ink-primary) dark:hover:text-white">
							<Icon name="x" height={18} width={18} />
						</Ariakit.DialogDismiss>
					</div>
					<p className="text-sm text-(--sub-text-muted)">
						Enter the email address of the person you want to invite. They will receive an email with a link to join
						your team.
					</p>
					<div className="flex flex-col gap-1.5">
						<label htmlFor="invite-email" className="text-xs font-medium text-(--sub-text-muted)">
							Email address
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-(--sub-text-muted)">
								<Icon name="mail" height={16} width={16} />
							</div>
							<input
								id="invite-email"
								type="email"
								placeholder="colleague@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') void handleInvite()
								}}
								className="w-full rounded-lg border border-(--sub-border-slate-100) bg-white py-2 pr-3 pl-9 text-sm text-(--sub-ink-primary) placeholder:text-(--sub-text-muted) focus:border-(--sub-brand-primary) focus:ring-1 focus:ring-(--sub-brand-primary) focus:outline-hidden dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark) dark:text-white"
								autoFocus
							/>
						</div>
					</div>
					<div className="flex gap-3">
						<button
							onClick={onClose}
							className="flex h-9 flex-1 items-center justify-center rounded-lg border border-(--sub-border-muted) text-sm font-medium text-(--sub-ink-primary) dark:border-(--sub-border-strong) dark:text-white"
						>
							Cancel
						</button>
						<button
							onClick={() => void handleInvite()}
							disabled={!email.trim() || inviteMemberMutation.isPending}
							className="flex h-9 flex-1 items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white disabled:opacity-50"
						>
							{inviteMemberMutation.isPending ? 'Sending...' : 'Send Invite'}
						</button>
					</div>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
