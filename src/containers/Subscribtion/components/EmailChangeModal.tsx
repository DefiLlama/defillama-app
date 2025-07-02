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
		<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={handleOutsideClick}>
			<div className="bg-[#1a1b1f] border border-[#39393E] rounded-xl p-6 shadow-xl max-w-md w-full">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-bold">{isWalletUser ? 'Add Email Address' : 'Change Email Address'}</h3>
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg hover:bg-[#39393E]/30 text-[#8a8c90] hover:text-white transition-colors"
					>
						<Icon name="x" height={16} width={16} />
					</button>
				</div>

				<form onSubmit={onSubmit} className="space-y-4">
					<div>
						<label htmlFor="new-email" className="block text-sm text-[#b4b7bc] mb-2">
							New Email Address
						</label>
						<input
							id="new-email"
							type="email"
							required
							className="w-full py-3 px-4 text-sm rounded-lg bg-[#222429] border border-[#39393E] text-white focus:outline-hidden focus:ring-2 focus:ring-[#5C5CF9] focus:border-transparent"
							placeholder="your.new.email@example.com"
							value={email}
							onChange={(e) => onEmailChange(e.target.value)}
							autoFocus
						/>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							className="px-4 py-2 text-sm bg-transparent hover:bg-[#39393E]/30 text-[#b4b7bc] rounded-lg transition-colors"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 text-sm bg-[#5C5CF9] hover:bg-[#4A4AF0] text-white rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
							disabled={isLoading || !email}
						>
							{isLoading ? (
								<>
									<span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
