import { Icon } from '~/components/Icon'

interface EmailVerificationWarningProps {
	email: string
	onResendVerification: () => void
	isLoading: boolean
}

export const EmailVerificationWarning = ({ email, onResendVerification, isLoading }: EmailVerificationWarningProps) => {
	return (
		<div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-[#2a2417] p-5 shadow-md">
			<div className="relative flex items-start gap-4">
				<div className="shrink-0 rounded-lg bg-amber-400/10 p-2 text-amber-400">
					<Icon name="alert-triangle" height={20} width={20} />
				</div>

				<div className="grow">
					<h3 className="mb-2 text-lg font-semibold text-amber-100">Verify Your Email Address</h3>
					<p className="mb-4 text-sm text-[#e0d5bc]">
						Please verify your email address to access all Pro features and API capabilities. We've sent a verification
						link to <span className="font-medium text-amber-100">{email}</span>.
					</p>

					<div className="flex flex-wrap gap-3">
						<button
							className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-amber-600"
							onClick={onResendVerification}
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
									Sending...
								</>
							) : (
								<>
									<Icon name="mail" height={14} width={14} />
									Resend Verification Email
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
