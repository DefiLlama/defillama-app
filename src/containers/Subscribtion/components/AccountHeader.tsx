import { Icon } from '~/components/Icon'
import { Subscription } from '~/hooks/useSubscribe'
interface AccountHeaderProps {
	isSubscribed: boolean
	onLogout: () => void
	isLoading: boolean
	subscription: Subscription
}

export const AccountHeader = ({ isSubscribed, onLogout, isLoading, subscription }: AccountHeaderProps) => {
	return (
		<div className="backdrop-filter backdrop-blur-lg bg-gradient-to-r from-[#1a1b1f]/80 to-[#1a1b1f]/60 border border-[#39393E]/30 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(92,92,249,0.1)] transition-all duration-300 group">
			<h1 className="text-xl font-bold tracking-tight flex items-center gap-3 bg-gradient-to-r from-white to-[#b4b7bc] bg-clip-text text-transparent group-hover:from-white group-hover:to-white transition-colors">
				<div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#5C5CF9] to-[#4335A8] flex items-center justify-center shadow-[0_4px_12px_rgba(92,92,249,0.25)] transform group-hover:rotate-3 transition-transform duration-300 relative overflow-hidden">
					<div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
					<Icon name="users" height={16} width={16} className="text-white" />
				</div>
				Account Settings
			</h1>

			<div className="flex items-center gap-3">
				{isSubscribed && (
					<div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-[#5C5CF9]/10 to-[#4335A8]/10 text-[#5C5CF9] rounded-full border border-[#5C5CF9]/20 shadow-[0_0_10px_rgba(92,92,249,0.15)] group-hover:shadow-[0_0_15px_rgba(92,92,249,0.25)] transition-shadow duration-300 relative overflow-hidden">
						<div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(92,92,249,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
						<Icon name="bookmark" height={14} width={14} className="text-[#5C5CF9]" />
						<span className="text-sm font-semibold">
							{subscription?.type === 'llamafeed' ? 'Llama+ subscription' : 'Pro subscription'}
						</span>
					</div>
				)}
				<button
					className="py-2 px-4 rounded-lg border border-[#39393E] hover:border-[#5C5CF9]/30 bg-[#222429]/70 hover:bg-[#222429] text-[#b4b7bc] hover:text-white transition-all duration-200 flex items-center gap-2 text-sm shadow-md hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] group/btn"
					onClick={onLogout}
					disabled={isLoading}
					aria-label="Sign out of your account"
				>
					<Icon
						name="arrow-right"
						height={14}
						width={14}
						className="group-hover/btn:translate-x-0.5 transition-transform"
					/>
					{isLoading ? 'Signing out...' : 'Sign Out'}
				</button>
			</div>
		</div>
	)
}
