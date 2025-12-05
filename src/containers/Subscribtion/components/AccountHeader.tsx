import { Icon } from '~/components/Icon'
import { Subscription } from '~/containers/Subscribtion/useSubscribe'

interface AccountHeaderProps {
	isSubscribed: boolean
	onLogout: () => void
	isLoading: boolean
	subscription: Subscription
}

export const AccountHeader = ({ isSubscribed, onLogout, isLoading, subscription }: AccountHeaderProps) => {
	return (
		<div className="group mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-[#39393E]/30 bg-linear-to-r from-[#1a1b1f]/80 to-[#1a1b1f]/60 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] backdrop-blur-lg backdrop-filter transition-all duration-300 hover:shadow-[0_8px_30px_rgba(92,92,249,0.1)] sm:flex-row sm:items-center">
			<h1 className="flex items-center gap-3 bg-linear-to-r from-white to-[#b4b7bc] bg-clip-text text-xl font-bold tracking-tight text-transparent transition-colors group-hover:from-white group-hover:to-white">
				<div className="relative flex h-8 w-8 transform items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-[#5C5CF9] to-[#4335A8] shadow-[0_4px_12px_rgba(92,92,249,0.25)] transition-transform duration-300 group-hover:rotate-3">
					<div className="animate-shimmer absolute inset-0 h-full w-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-size-[250%_250%] opacity-0 transition-opacity group-hover:opacity-100"></div>
					<Icon name="users" height={16} width={16} className="text-white" />
				</div>
				Account Settings
			</h1>

			<div className="flex items-center gap-3">
				{isSubscribed && (
					<div className="relative flex items-center gap-2 overflow-hidden rounded-full border border-[#5C5CF9]/20 bg-linear-to-r from-[#5C5CF9]/10 to-[#4335A8]/10 px-4 py-1.5 text-[#5C5CF9] shadow-[0_0_10px_rgba(92,92,249,0.15)] transition-shadow duration-300 group-hover:shadow-[0_0_15px_rgba(92,92,249,0.25)]">
						<div className="animate-shimmer absolute inset-0 h-full w-full bg-[linear-gradient(45deg,transparent_25%,rgba(92,92,249,0.1)_50%,transparent_75%)] bg-size-[250%_250%] opacity-0 transition-opacity group-hover:opacity-100"></div>
						<Icon name="bookmark" height={14} width={14} className="text-[#5C5CF9]" />
						<span className="text-sm font-semibold">
							{subscription?.type === 'llamafeed' ? 'Pro subscription' : 'API subscription'}
						</span>
					</div>
				)}
				<button
					className="group/btn flex items-center gap-2 rounded-lg border border-[#39393E] bg-[#222429]/70 px-4 py-2 text-sm text-[#b4b7bc] shadow-md transition-all duration-200 hover:border-[#5C5CF9]/30 hover:bg-[#222429] hover:text-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
					onClick={onLogout}
					disabled={isLoading}
					aria-label="Sign out of your account"
				>
					<Icon
						name="arrow-right"
						height={14}
						width={14}
						className="transition-transform group-hover/btn:translate-x-0.5"
					/>
					{isLoading ? 'Signing out...' : 'Sign Out'}
				</button>
			</div>
		</div>
	)
}
