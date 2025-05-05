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

	const {
		subscription,
		apiKey,
		isApiKeyLoading,
		generateNewKey,
		credits,
		isCreditsLoading,
		createPortalSession,
		isPortalSessionLoading,
		apiSubscription,
		llamafeedSubscription,
		legacySubscription
	} = useSubscribe()
	const isSubscribed = subscription?.status === 'active'
	const isLegacyActive = legacySubscription?.status === 'active'

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
			{isLegacyActive && (
				<div className="flex items-center gap-3 bg-gradient-to-r from-yellow-400/10 to-yellow-900/30 border border-yellow-500 text-yellow-100 rounded-xl px-6 py-4 w-full shadow-sm mb-4">
					<Icon name="alert-triangle" className="text-yellow-400 flex-shrink-0" height={24} width={24} />
					<span className="text-base font-medium">
						Your current subscription is a legacy plan. You need to unsubscribe via{' '}
						<a
							href="https://subscriptions.llamapay.io/"
							target="_blank"
							rel="noopener noreferrer"
							className="underline text-yellow-300"
						>
							LlamaPay
						</a>{' '}
						and subscribe again after current subscription expires. This is required due to technical reasons.
					</span>
				</div>
			)}

			<div className="space-y-6">
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
					apiSubscription={apiSubscription}
					llamafeedSubscription={llamafeedSubscription}
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
