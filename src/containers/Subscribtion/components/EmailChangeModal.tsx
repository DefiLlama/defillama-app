import { FormEvent } from 'react'
import { Icon } from '~/components/Icon'

interface EmailChangeModalProps {
	isOpen: boolean
	onClose: () => void
	onSubmit: (e: FormEvent<HTMLFormElement>) => void
	email: string
	onEmailChange: (value: string) => void
	isLoading: boolean
	isWalletUser?: boolean
}

export const EmailChangeModal = ({
	isOpen,
	onClose,
	onSubmit,
	email,
	onEmailChange,
	isLoading,
	isWalletUser
}: EmailChangeModalProps) => {
	if (!isOpen) return null

	const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			onClose()
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={handleOutsideClick}>
			<div className="w-full max-w-md rounded-xl border border-[#39393E] bg-[#1a1b1f] p-6 shadow-xl">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-lg font-bold">{isWalletUser ? 'Add Email Address' : 'Change Email Address'}</h3>
					<button
						onClick={onClose}
						className="rounded-lg p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E]/30 hover:text-white"
					>
						<Icon name="x" height={16} width={16} />
					</button>
				</div>

				<form onSubmit={onSubmit} className="space-y-4">
					<div>
						<label htmlFor="new-email" className="mb-2 block text-sm text-[#b4b7bc]">
							New Email Address
						</label>
						<input
							id="new-email"
							type="email"
							required
							className="w-full rounded-lg border border-[#39393E] bg-[#222429] px-4 py-3 text-sm text-white focus:border-transparent focus:ring-2 focus:ring-[#5C5CF9] focus:outline-hidden"
							placeholder="your.new.email@example.com"
							value={email}
							onChange={(e) => onEmailChange(e.target.value)}
							autoFocus
						/>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							className="rounded-lg bg-transparent px-4 py-2 text-sm text-[#b4b7bc] transition-colors hover:bg-[#39393E]/30"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="flex items-center gap-2 rounded-lg bg-[#5C5CF9] px-4 py-2 text-sm text-white shadow-md transition-colors hover:bg-[#4A4AF0] disabled:opacity-50"
							disabled={isLoading || !email}
						>
							{isLoading ? (
								<>
									<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
									Processing...
								</>
							) : (
								<>
									<Icon name="check" height={14} width={14} />
									{isWalletUser ? 'Add Email' : 'Save Changes'}
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
