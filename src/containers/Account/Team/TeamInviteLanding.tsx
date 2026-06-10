import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import { SignInDialog } from '~/containers/Subscription/SignInDialog'

export function TeamInviteLanding() {
	const dialogStore = Ariakit.useDialogStore()
	const isOpen = Ariakit.useStoreState(dialogStore, 'open')
	const [initialStep, setInitialStep] = useState<'signin' | 'signup'>('signup')

	const openDialog = (step: 'signin' | 'signup') => {
		setInitialStep(step)
		dialogStore.show()
	}

	return (
		<div className="flex flex-col items-center gap-6 py-16">
			<img src="/assets/account_avatar.png" alt="" className="size-16 rounded-full" />
			<div className="flex flex-col gap-2 text-center">
				<h2 className="text-xl font-semibold text-(--sub-ink-primary) dark:text-white">
					You&apos;ve been invited to join a team on DefiLlama
				</h2>
				<p className="max-w-md text-sm text-(--sub-text-muted)">
					Create an account with the email address this invite was sent to and you&apos;ll be added to the team
					automatically.
				</p>
			</div>
			<button
				type="button"
				className="flex h-10 items-center gap-2 rounded-lg bg-(--sub-brand-primary) px-5 text-sm font-medium text-white"
				onClick={() => openDialog('signup')}
			>
				Sign Up & Accept
			</button>
			<p className="text-sm text-(--sub-text-muted)">
				Already have an account?{' '}
				<button type="button" className="text-(--link)" onClick={() => openDialog('signin')}>
					Sign in
				</button>
			</p>
			{isOpen ? <SignInDialog store={dialogStore} initialStep={initialStep} suppressVerifyEmailPrompt /> : null}
		</div>
	)
}
