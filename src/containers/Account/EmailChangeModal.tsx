import { useState } from 'react'
import { Icon } from '~/components/Icon'
import pb from '~/utils/pocketbase'

interface EmailChangeModalProps {
	isOpen: boolean
	onClose: () => void
}

export function EmailChangeModal({ isOpen, onClose }: EmailChangeModalProps) {
	const [email, setEmail] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleClose = () => {
		setEmail('')
		setError('')
		onClose()
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!email || isLoading) return

		setError('')
		setIsLoading(true)
		try {
			await pb.collection('users').requestEmailChange(email)
			// Refresh auth to update user state (verified will become false for new email)
			try {
				await pb.collection('users').authRefresh()
			} catch {}
			handleClose()
		} catch {
			setError('This email is already associated with another account.')
		} finally {
			setIsLoading(false)
		}
	}

	if (!isOpen) return null

	const hasError = !!error
	const canSubmit = !!email && !hasError && !isLoading

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
			onClick={(e) => e.target === e.currentTarget && handleClose()}
		>
			<div className="flex w-full max-w-[331px] flex-col gap-5 rounded-2xl border border-(--sub-border-slate-100) bg-white px-5 py-6 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h3 className="text-xl leading-7 font-semibold text-(--sub-ink-primary) dark:text-white">
						Change Your Email
					</h3>
					<button
						onClick={handleClose}
						className="rounded-full p-1 text-(--sub-ink-primary) transition-colors dark:text-white"
					>
						<Icon name="x" height={24} width={24} />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="flex flex-col gap-5">
					<label className="text-sm leading-[21px] text-(--sub-ink-primary) dark:text-white">
						Enter your new email:
					</label>

					<div className="flex flex-col gap-2">
						<input
							type="email"
							required
							value={email}
							onChange={(e) => {
								setEmail(e.target.value)
								if (error) setError('')
							}}
							placeholder="your.new.email@example.com"
							className={`h-10 w-full rounded-lg border bg-(--sub-surface-panel) px-3 text-sm leading-[21px] text-(--sub-ink-primary) outline-none dark:bg-(--sub-ink-primary) dark:text-white ${
								hasError
									? 'border-(--error)'
									: 'border-(--sub-border-muted) focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:focus:border-(--sub-brand-primary)'
							}`}
						/>
						{hasError && <p className="text-xs leading-4 text-(--error)">{error}</p>}
					</div>

					<button
						type="submit"
						disabled={!canSubmit}
						className="flex h-10 w-full items-center justify-center rounded-lg bg-(--sub-brand-primary) text-sm font-medium text-white disabled:opacity-25"
					>
						{isLoading ? 'Sending...' : 'Confirm Email'}
					</button>
				</form>
			</div>
		</div>
	)
}
