import { Icon } from '~/components/Icon'
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
	return (
		<div className="backdrop-filter backdrop-blur-md bg-linear-to-r from-[#1a1b1f]/90 to-[#1a1b1f]/70 border border-[#39393E]/30 rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgba(92,92,249,0.1)] transition-shadow duration-300">
			<div className="p-4 border-b border-[#39393E]/20">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-xl bg-linear-to-br from-[#5C5CF9] to-[#4335A8] flex items-center justify-center text-base font-medium text-white shadow-[0_4px_12px_rgba(92,92,249,0.25)] relative overflow-hidden group">
							{user.address ? <Icon name="ethereum" height={20} width={20} /> : user.email.charAt(0).toUpperCase()}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-xl font-bold bg-linear-to-r from-white to-[#b4b7bc] bg-clip-text text-transparent">
									{user.address ? null : user.email.split('@')[0]}
								</h2>
								{isVerified && (
									<span className="flex items-center justify-center h-5 w-5 bg-green-400/10 text-green-400 rounded-full transform hover:scale-110 transition-transform">
										<Icon name="check" height={10} width={10} />
									</span>
								)}
							</div>
							<p className="text-sm text-[#8a8c90] truncate max-w-[200px] sm:max-w-[300px]">
								{user.address ? user.address : user.email}
							</p>
							{user.ethereum_email && (
								<div className="mt-2">
									<p className="font-mono text-sm text-[#b4b7bc] truncate">{user.ethereum_email}</p>
								</div>
							)}
						</div>
					</div>

					{
						<button
							onClick={onEmailChange}
							className="py-2 px-4 rounded-lg bg-[#222429]/70 hover:bg-[#222429] border border-[#39393E]/50 hover:border-[#5C5CF9]/50 transition-all duration-200 text-sm shadow-md flex items-center gap-2 group hover:shadow-[0_4px_12px_rgba(92,92,249,0.15)]"
						>
							<Icon
								name="mail"
								height={14}
								width={14}
								className="text-[#5C5CF9] group-hover:scale-110 transition-transform"
							/>
							<span className="bg-linear-to-r from-white to-[#b4b7bc] group-hover:from-white group-hover:to-white bg-clip-text text-transparent transition-colors">
								Change Email
							</span>
						</button>
					}
				</div>
			</div>

			<div className="p-5">
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
					<div className="flex flex-col p-3.5 bg-linear-to-br from-[#222429]/90 to-[#1d1e23]/70 rounded-xl border border-[#39393E]/40 hover:border-[#5C5CF9]/30 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] transform hover:translate-y-[-2px] group">
						<span className="text-xs text-[#8a8c90] mb-1.5">Status</span>
						<span className="font-medium text-sm flex items-center gap-2">
							<span className="bg-linear-to-r from-white to-[#b4b7bc] group-hover:from-white group-hover:to-white bg-clip-text text-transparent transition-colors">
								{subscription.status === 'active' ? (
									<>
										<span className="h-2 w-2 mr-1 rounded-full inline-block bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse"></span>
										Active
									</>
								) : (
									<>
										<span className="h-2 w-2 mr-1 rounded-full inline-block bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></span>
										Inactive
									</>
								)}
							</span>
						</span>
					</div>
					<div className="flex flex-col p-3.5 bg-linear-to-br from-[#222429]/90 to-[#1d1e23]/70 rounded-xl border border-[#39393E]/40 hover:border-[#5C5CF9]/30 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] transform hover:translate-y-[-2px] group">
						<span className="text-xs text-[#8a8c90] mb-1.5">Membership</span>
						<span className="font-medium text-sm bg-linear-to-r from-white to-[#b4b7bc] group-hover:from-white group-hover:to-white bg-clip-text text-transparent transition-colors">
							{isSubscribed ? (
								<span className="flex items-center gap-2">
									<span>{subscription.type === 'llamafeed' ? 'Llama+' : 'Pro'}</span>
									<Icon
										name="star"
										height={12}
										width={12}
										className="text-[#5C5CF9] opacity-0 group-hover:opacity-100 transition-opacity"
									/>
								</span>
							) : (
								'Free'
							)}
						</span>
					</div>
					<div className="flex flex-col p-3.5 bg-linear-to-br from-[#222429]/90 to-[#1d1e23]/70 rounded-xl border border-[#39393E]/40 hover:border-[#5C5CF9]/30 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] transform hover:translate-y-[-2px] group">
						<span className="text-xs text-[#8a8c90] mb-1.5">API Access</span>
						<span className="font-medium text-sm bg-linear-to-r from-white to-[#b4b7bc] group-hover:from-white group-hover:to-white bg-clip-text text-transparent transition-colors">
							{isSubscribed && subscription.type !== 'llamafeed' ? (
								<span className="flex items-center gap-2">
									<span>Enabled</span>
									<span className="h-1.5 w-1.5 rounded-full bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity"></span>
								</span>
							) : (
								'Disabled'
							)}
						</span>
					</div>
				</div>

				{user.walletAddress && (
					<div className="mt-4 p-3.5 bg-linear-to-br from-[#222429]/90 to-[#1d1e23]/70 rounded-xl border border-[#39393E]/40 hover:border-[#5C5CF9]/30 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] group">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs text-[#8a8c90]">Wallet</span>
							<span className="text-xs flex items-center gap-1 text-green-400">
								<Icon name="check" height={8} width={8} />
								<span>Connected</span>
							</span>
						</div>
						<div className="flex items-center justify-between">
							<p className="font-mono text-sm text-[#b4b7bc] truncate">
								{`${user.walletAddress.substring(0, 8)}...${user.walletAddress.substring(
									user.walletAddress.length - 6
								)}`}
							</p>
							<button className="h-6 w-6 flex items-center justify-center rounded-full bg-[#1a1b1f] text-[#5C5CF9] hover:text-[#6A6AFA] hover:bg-[#5C5CF9]/5 transition-colors opacity-0 group-hover:opacity-100">
								<Icon name="copy" height={12} width={12} />
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
