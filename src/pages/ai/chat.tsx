import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { setPendingPrompt } from '~/components/LlamaAIFloatingButton'
import { DeepLinkPromptModal } from '~/containers/LlamaAI/components/DeepLinkPromptModal'
import { LlamaAIShell } from '~/containers/LlamaAI/LlamaAIShell'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('LlamaAi', () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

function LlamaAIPage() {
	const router = useRouter()
	const { user, loaders } = useAuthContext()
	const signInDialogStore = Ariakit.useDialogStore()
	const promptParam = typeof router.query.prompt === 'string' ? router.query.prompt.trim() : ''

	if (loaders.userLoading || user) return null

	const handleConfirmDeepLinkPrompt = () => {
		if (!promptParam) return
		setPendingPrompt(promptParam)
		void router.replace('/ai/chat', undefined, { shallow: true })
		signInDialogStore.show()
	}

	const handleCloseDeepLinkPrompt = () => {
		void router.replace('/ai/chat', undefined, { shallow: true })
	}

	return (
		<>
			<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
				<p className="flex items-center gap-1 text-center">
					Please{' '}
					<button onClick={signInDialogStore.show} className="underline">
						sign in
					</button>{' '}
					to access this page.
				</p>
			</div>
			<SignInModal store={signInDialogStore} hideWhenAuthenticated={false} />
			<DeepLinkPromptModal
				isOpen={!!promptParam}
				prompt={promptParam}
				onClose={handleCloseDeepLinkPrompt}
				onConfirm={handleConfirmDeepLinkPrompt}
			/>
		</>
	)
}

LlamaAIPage.getLayout = LlamaAIShell.getLayout

export default LlamaAIPage
