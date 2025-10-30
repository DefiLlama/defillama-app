import { Icon } from '~/components/Icon'

interface EmailVerificationWarningProps {
	email: string
	onResendVerification: () => void
	isLoading: boolean
}

export const EmailVerificationWarning = ({ email, onResendVerification, isLoading }: EmailVerificationWarningProps) => {
	return (
		<div className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 sm:px-4 sm:py-3">
			<div className="relative flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<Icon name="alert-triangle" height={16} width={16} className="shrink-0 text-amber-400" />
					<p className="text-xs text-amber-100 sm:text-sm">
						Verify your email <span className="font-medium">{email}</span> to subscribe
					</p>
				</div>

				<button
					className="flex shrink-0 items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/30 disabled:opacity-50 sm:gap-2 sm:px-3"
					onClick={onResendVerification}
					disabled={isLoading}
				>
					{isLoading ? (
						<>
							<span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-100/30 border-t-amber-100"></span>
							Sending...
						</>
					) : (
						<>
							<Icon name="mail" height={12} width={12} />
							<span className="hidden sm:inline">Resend</span>
						</>
					)}
				</button>
			</div>
		</div>
	)
}
