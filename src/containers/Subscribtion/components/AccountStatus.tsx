import { Icon } from '~/components/Icon'
import { resolveUserEmail } from '~/components/Nav/Account'
import { formatEthAddress } from '~/utils'
import { AuthModel } from '~/utils/pocketbase'

interface User extends AuthModel {
	subscription_status: string
	subscription: {
		id: string
		expires_at: string
		status: string
	}
	walletAddress?: string
}

interface AccountStatusProps {
	user: User
	isVerified: boolean
	isSubscribed: boolean
	onEmailChange: () => void
	subscription: any
}

export const AccountStatus = ({ user, isVerified, isSubscribed, onEmailChange, subscription }: AccountStatusProps) => {
	const resolvedEmail = resolveUserEmail(user)
	const hasEmail = Boolean(resolvedEmail)
	const hasWallet = Boolean(user?.walletAddress)

	return (
		<div className="overflow-hidden rounded-xl border border-[#39393E]/30 bg-linear-to-r from-[#1a1b1f]/90 to-[#1a1b1f]/70 shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-md backdrop-filter transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(92,92,249,0.1)]">
			<div className="border-b border-[#39393E]/20 p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-[#5C5CF9] to-[#4335A8] text-base font-medium text-white shadow-[0_4px_12px_rgba(92,92,249,0.25)]">
							{hasWallet ? <Icon name="ethereum" height={20} width={20} /> : resolvedEmail.charAt(0).toUpperCase()}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="bg-linear-to-r from-white to-[#b4b7bc] bg-clip-text text-xl font-bold text-transparent">
									{resolvedEmail ? resolvedEmail.split('@')[0] : user?.walletAddress}
								</h2>
								{isVerified && (
									<span className="flex h-5 w-5 transform items-center justify-center rounded-full bg-green-400/10 text-green-400 transition-transform hover:scale-110">
										<Icon name="check" height={10} width={10} />
									</span>
								)}
							</div>
							{hasWallet && (
								<p className="max-w-[200px] truncate text-sm text-[#8a8c90] sm:max-w-[300px]">
									{formatEthAddress(user.walletAddress)}
								</p>
							)}
							{hasEmail && (
								<p className="max-w-[200px] truncate text-sm text-[#8a8c90] sm:max-w-[300px]">{resolvedEmail}</p>
							)}
						</div>
					</div>

					{
						<button
							onClick={onEmailChange}
							className="group flex items-center gap-2 rounded-lg border border-[#39393E]/50 bg-[#222429]/70 px-4 py-2 text-sm shadow-md transition-all duration-200 hover:border-[#5C5CF9]/50 hover:bg-[#222429] hover:shadow-[0_4px_12px_rgba(92,92,249,0.15)]"
						>
							<Icon
								name="mail"
								height={14}
								width={14}
								className="text-[#5C5CF9] transition-transform group-hover:scale-110"
							/>
							<span className="bg-linear-to-r from-white to-[#b4b7bc] bg-clip-text text-transparent transition-colors group-hover:from-white group-hover:to-white">
								Change Email
							</span>
						</button>
					}
				</div>
			</div>

			<div className="p-5">
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
					<div className="group flex transform flex-col rounded-xl border border-[#39393E]/40 bg-linear-to-br from-[#222429]/90 to-[#1d1e23]/70 p-3.5 transition-all duration-300 hover:translate-y-[-2px] hover:border-[#5C5CF9]/30 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
						<span className="mb-1.5 text-xs text-[#8a8c90]">Status</span>
						<span className="flex items-center gap-2 text-sm font-medium">
							<span className="bg-linear-to-r from-white to-[#b4b7bc] bg-clip-text text-transparent transition-colors group-hover:from-white group-hover:to-white">
								{subscription.status === 'active' ? (
									<>
										<span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
										Active
									</>
								) : (
									<>
										<span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
										Inactive
									</>
								)}
							</span>
						</span>
					</div>
					<div className="group flex transform flex-col rounded-xl border border-[#39393E]/40 bg-linear-to-br from-[#222429]/90 to-[#1d1e23]/70 p-3.5 transition-all duration-300 hover:translate-y-[-2px] hover:border-[#5C5CF9]/30 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
						<span className="mb-1.5 text-xs text-[#8a8c90]">Membership</span>
						<span className="bg-linear-to-r from-white to-[#b4b7bc] bg-clip-text text-sm font-medium text-transparent transition-colors group-hover:from-white group-hover:to-white">
							{isSubscribed ? (
								<span className="flex items-center gap-2">
									<span>
										{subscription.type === 'llamafeed' ? 'Pro' : 'API'}
										{subscription.provider === 'trial' && ' Trial'}
									</span>
									<Icon
										name="star"
										height={12}
										width={12}
										className="text-[#5C5CF9] opacity-0 transition-opacity group-hover:opacity-100"
									/>
								</span>
							) : (
								'Free'
							)}
						</span>
					</div>
					<div className="group flex transform flex-col rounded-xl border border-[#39393E]/40 bg-linear-to-br from-[#222429]/90 to-[#1d1e23]/70 p-3.5 transition-all duration-300 hover:translate-y-[-2px] hover:border-[#5C5CF9]/30 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
						<span className="mb-1.5 text-xs text-[#8a8c90]">API Access</span>
						<span className="bg-linear-to-r from-white to-[#b4b7bc] bg-clip-text text-sm font-medium text-transparent transition-colors group-hover:from-white group-hover:to-white">
							{isSubscribed && subscription.type !== 'llamafeed' ? (
								<span className="flex items-center gap-2">
									<span>Enabled</span>
									<span className="h-1.5 w-1.5 rounded-full bg-green-400 opacity-0 transition-opacity group-hover:opacity-100"></span>
								</span>
							) : (
								'Disabled'
							)}
						</span>
					</div>
				</div>

				{subscription?.provider === 'trial' && subscription?.expires_at && (
					<div className="group mt-4 rounded-xl border border-orange-500/30 bg-linear-to-br from-[#222429]/90 to-[#1d1e23]/70 p-3.5 transition-all duration-300 hover:border-orange-500/50 hover:shadow-[0_4px_12px_rgba(251,146,60,0.15)]">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<svg className="h-4 w-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span className="text-sm font-medium text-orange-400">Trial Expires</span>
							</div>
							<span className="text-sm text-[#b4b7bc]">
								{new Date(parseFloat(subscription.expires_at) * 1000).toLocaleString()}
							</span>
						</div>
					</div>
				)}

				{user.walletAddress && (
					<div className="group mt-4 rounded-xl border border-[#39393E]/40 bg-linear-to-br from-[#222429]/90 to-[#1d1e23]/70 p-3.5 transition-all duration-300 hover:border-[#5C5CF9]/30 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-xs text-[#8a8c90]">Wallet</span>
							<span className="flex items-center gap-1 text-xs text-green-400">
								<Icon name="check" height={8} width={8} />
								<span>Connected</span>
							</span>
						</div>
						<div className="flex items-center justify-between">
							<p className="truncate font-mono text-sm text-[#b4b7bc]">
								{`${user.walletAddress.substring(0, 8)}...${user.walletAddress.substring(
									user.walletAddress.length - 6
								)}`}
							</p>
							<button className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a1b1f] text-[#5C5CF9] opacity-0 transition-colors group-hover:opacity-100 hover:bg-[#5C5CF9]/5 hover:text-[#6A6AFA]">
								<Icon name="copy" height={12} width={12} />
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
