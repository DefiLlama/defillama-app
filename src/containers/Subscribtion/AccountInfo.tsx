import { FormEvent, useState } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { Icon } from '~/components/Icon'
import { AccountHeader } from './components/AccountHeader'
import { AccountStatus } from './components/AccountStatus'
import { EmailVerificationWarning } from './components/EmailVerificationWarning'
import { SubscriberContent } from './components/SubscriberContent'
import { EmailChangeModal } from './components/EmailChangeModal'
import { LocalLoader } from '~/components/LocalLoader'

export const AccountInfo = () => {
	const [newEmail, setNewEmail] = useState('')
	const [showEmailForm, setShowEmailForm] = useState(false)

	const { user, isAuthenticated, logout, changeEmail, resendVerification, loaders } = useAuthContext()
	console.log(user)
	const {
		subscription,
		handleSubscribe,
		loading,
		apiKey,
		isApiKeyLoading,
		generateNewKey,
		credits,
		isCreditsLoading,
		createPortalSession,
		isPortalSessionLoading,
		isLlamafeedSubscriptionActive
	} = useSubscribe()
	const isSubscribed = subscription?.status === 'active'
	const isVerified = user?.verified
	const handleEmailChange = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		changeEmail(newEmail)
		setNewEmail('')
		setShowEmailForm(false)
	}

	const handleResendVerification = async () => {
		if (user?.email) {
			resendVerification(user.email)
		}
	}

	const handleLogout = async () => {
		try {
			logout()
		} catch (error) {
			console.error('Error logging out:', error)
		}
	}

	if (loaders.userLoading || loaders.userFetching) {
		return (
			<div className="flex justify-center items-center h-[40vh]">
				<LocalLoader />
			</div>
		)
	}

	if (!isAuthenticated || !user) {
		return (
			<div className="bg-[#1a1b1f] backdrop-filter backdrop-blur-md rounded-2xl border border-[#39393E]/40 p-10 shadow-xl relative overflow-hidden group transition-all duration-300 hover:shadow-[0_8px_30px_rgba(92,92,249,0.15)]">
				<div className="absolute -inset-1 blur-[80px] bg-gradient-to-r from-[#5C5EFC]/10 to-[#462A92]/10 opacity-70 -z-10 group-hover:opacity-100 transition-opacity"></div>
				<div className="w-16 h-16 bg-gradient-to-br from-[#2a2b30] to-[#222429] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg transform group-hover:scale-110 transition-all duration-300">
					<Icon
						name="users"
						height={28}
						width={28}
						className="text-[#5C5CF9] group-hover:text-[#6A6AFA] transition-colors"
					/>
				</div>
				<h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-white to-[#b4b7bc] bg-clip-text text-transparent">
					Account Access Required
				</h2>
				<p className="text-[#b4b7bc] mb-6 max-w-md mx-auto">
					Please sign in to view and manage your account information and subscription details.
				</p>
				<button
					onClick={() => (window.location.href = '/subscribe')}
					className="relative px-6 py-3 bg-gradient-to-r from-[#5C5CF9] to-[#4335A8] hover:from-[#4A4AF0] hover:to-[#3925A0] text-white rounded-lg transition-all duration-300 shadow-[0_4px_20px_rgba(92,92,249,0.25)] flex items-center gap-2 mx-auto overflow-hidden group"
				>
					<div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
					<Icon
						name="arrow-right"
						height={18}
						width={18}
						className="transform group-hover:translate-x-1 transition-transform"
					/>
					<span>Sign In Now</span>
				</button>
			</div>
		)
	}

	return (
		<div className="relative before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-48 before:bg-gradient-to-b before:from-[#5C5EFC]/10 before:via-[#462A92]/5 before:to-transparent before:-z-10">
			<AccountHeader
				isSubscribed={isSubscribed}
				onLogout={handleLogout}
				isLoading={loaders.logout}
				subscription={subscription}
			/>

			<div className="space-y-6">
				{isLlamafeedSubscriptionActive && (
					<div
						className="bg-[#332B15] border border-[#AA9051] text-[#EED484] px-4 py-3 rounded-lg relative"
						role="alert"
					>
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
							<div>
								<strong className="font-bold">Llamafeed Subscription Active </strong>
								<span className="block sm:inline">
									You can cancel your Llamafeed subscription as it's already included in your Pro plan.
								</span>
							</div>
							<button
								onClick={() => window.open('https://llamafeed.io', '_blank')}
								className="px-4 py-2 bg-[#AA9051] hover:bg-[#C4A969] text-[#1A1B1F] rounded-lg transition-all duration-300 text-sm font-medium whitespace-nowrap"
							>
								Cancel on Llamafeed.io
							</button>
						</div>
					</div>
				)}
				<AccountStatus
					user={user}
					isVerified={isVerified}
					isSubscribed={isSubscribed}
					onEmailChange={() => setShowEmailForm(true)}
					subscription={subscription}
				/>

				{!isVerified && !user.address && (
					<EmailVerificationWarning
						email={user.email}
						onResendVerification={handleResendVerification}
						isLoading={loaders.resendVerification}
					/>
				)}

				<SubscriberContent
					apiKey={apiKey}
					isApiKeyLoading={isApiKeyLoading}
					generateNewKey={generateNewKey}
					credits={credits}
					isCreditsLoading={isCreditsLoading}
					subscription={subscription}
					createPortalSession={createPortalSession}
					isPortalSessionLoading={isPortalSessionLoading}
				/>
			</div>

			<EmailChangeModal
				isOpen={showEmailForm}
				onClose={() => setShowEmailForm(false)}
				onSubmit={handleEmailChange}
				email={newEmail}
				onEmailChange={setNewEmail}
				isLoading={loaders.changeEmail}
			/>
		</div>
	)
}
