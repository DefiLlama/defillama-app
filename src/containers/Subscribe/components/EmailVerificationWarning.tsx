import { Icon } from '~/components/Icon'

interface EmailVerificationWarningProps {
	email: string
	onResendVerification: () => void
	isLoading: boolean
}

export const EmailVerificationWarning = ({ email, onResendVerification, isLoading }: EmailVerificationWarningProps) => {
	return (
		<div className="bg-[#2a2417] border border-amber-500/20 rounded-xl p-5 shadow-md relative overflow-hidden">
			<div className="flex gap-4 items-start relative">
				<div className="flex-shrink-0 bg-amber-400/10 text-amber-400 p-2 rounded-lg">
					<Icon name="alert-triangle" height={20} width={20} />
				</div>

				<div className="flex-grow">
					<h3 className="text-lg font-semibold text-amber-100 mb-2">Verify Your Email Address</h3>
					<p className="text-[#e0d5bc] mb-4 text-sm">
						Please verify your email address to access all Pro features and API capabilities. We've sent a verification
						link to <span className="font-medium text-amber-100">{email}</span>.
					</p>

					<div className="flex flex-wrap gap-3">
						<button
							className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors shadow-md flex items-center gap-2 text-sm font-medium"
							onClick={onResendVerification}
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
