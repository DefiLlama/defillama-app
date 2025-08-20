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

	const { user, isAuthenticated, logout, changeEmail, resendVerification, loaders, addEmail } = useAuthContext()

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
	const isLegacyApiSubscription = apiSubscription?.status === 'active' && apiSubscription?.provider === 'legacy'
	const isWalletUser = user?.email?.includes('@defillama.com')

	const isVerified = user?.verified
	const handleEmailChange = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (isWalletUser) {
			await addEmail(newEmail)
		} else {
			changeEmail(newEmail)
		}
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
			<div className="flex h-[40vh] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	if (!isAuthenticated || !user) {
		return (
			<div className="group relative overflow-hidden rounded-2xl border border-[#39393E]/40 bg-[#1a1b1f] p-10 shadow-xl backdrop-blur-md backdrop-filter transition-all duration-300 hover:shadow-[0_8px_30px_rgba(92,92,249,0.15)]">
				<div className="absolute -inset-1 -z-10 bg-linear-to-r from-[#5C5EFC]/10 to-[#462A92]/10 opacity-70 blur-[80px] transition-opacity group-hover:opacity-100"></div>
				<div className="mx-auto mb-6 flex h-16 w-16 transform items-center justify-center rounded-full bg-linear-to-br from-[#2a2b30] to-[#222429] shadow-lg transition-all duration-300 group-hover:scale-110">
					<Icon
						name="users"
						height={28}
						width={28}
						className="text-[#5C5CF9] transition-colors group-hover:text-[#6A6AFA]"
					/>
				</div>
				<h2 className="mb-4 bg-linear-to-r from-white to-[#b4b7bc] bg-clip-text text-xl font-bold text-transparent">
					Account Access Required
				</h2>
				<p className="mx-auto mb-6 max-w-md text-[#b4b7bc]">
					Please sign in to view and manage your account information and subscription details.
				</p>
				<button
					onClick={() => (window.location.href = '/subscribe')}
					className="group relative mx-auto flex items-center gap-2 overflow-hidden rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#4335A8] px-6 py-3 text-white shadow-[0_4px_20px_rgba(92,92,249,0.25)] transition-all duration-300 hover:from-[#4A4AF0] hover:to-[#3925A0]"
				>
					<div className="animate-shimmer absolute inset-0 h-full w-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-size-[250%_250%] opacity-0 transition-opacity group-hover:opacity-100"></div>
					<Icon
						name="arrow-right"
						height={18}
						width={18}
						className="transform transition-transform group-hover:translate-x-1"
					/>
					<span>Sign In Now</span>
				</button>
			</div>
		)
	}

	return (
		<div className="relative before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-48 before:bg-linear-to-b before:from-[#5C5EFC]/10 before:via-[#462A92]/5 before:to-transparent before:content-['']">
			<AccountHeader
				isSubscribed={isSubscribed}
				onLogout={handleLogout}
				isLoading={loaders.logout}
				subscription={subscription}
			/>
			{isLegacyApiSubscription && (
				<div className="mb-4 flex w-full items-center gap-3 rounded-xl border border-yellow-500 bg-linear-to-r from-yellow-400/10 to-yellow-900/30 px-6 py-4 text-yellow-100 shadow-xs">
					<Icon name="alert-triangle" className="shrink-0 text-yellow-400" height={24} width={24} />
					<span className="text-base font-medium">
						Your current subscription is a legacy plan. You need to unsubscribe via{' '}
						<a
							href="https://subscriptions.llamapay.io/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-yellow-300 underline"
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

				{!isVerified && !isWalletUser && (
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
					legacySubscription={legacySubscription}
				/>
			</div>

			<EmailChangeModal
				isOpen={showEmailForm}
				onClose={() => setShowEmailForm(false)}
				onSubmit={handleEmailChange}
				email={newEmail}
				onEmailChange={setNewEmail}
				isLoading={isWalletUser ? loaders.addEmail : loaders.changeEmail}
				isWalletUser={isWalletUser}
			/>
		</div>
	)
}
