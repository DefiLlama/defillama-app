import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { LlamaAIShell } from '~/containers/LlamaAI/LlamaAIShell'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'

function ProjectDetailPage() {
	const router = useRouter()
	const { id } = router.query
	const projectId = typeof id === 'string' ? id : null
	const { user, loaders } = useAuthContext()
	const signInDialogStore = Ariakit.useDialogStore()

	if (loaders.userLoading || !router.isReady) return null

	if (!projectId) {
		return <div className="flex flex-1 items-center justify-center text-sm">Invalid project</div>
	}

	if (user) return null

	if (!user) {
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
			</>
		)
	}

	return null
}

ProjectDetailPage.getLayout = LlamaAIShell.getLayout

export default ProjectDetailPage
