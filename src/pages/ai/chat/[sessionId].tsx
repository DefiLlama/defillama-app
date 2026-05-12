import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { LlamaAIShell } from '~/containers/LlamaAI/LlamaAIShell'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { useLlamaAINavigate } from '~/contexts/LlamaAINavigate'

function SessionPage() {
	const router = useRouter()
	const { sessionId, prompt: promptParam, shareToken: shareTokenParam } = router.query
	const resolvedSessionId = typeof sessionId === 'string' ? sessionId : null
	const { user, loaders } = useAuthContext()
	const signInDialogStore = Ariakit.useDialogStore()
	const navigate = useLlamaAINavigate()

	useEffect(() => {
		if (!router.isReady || !resolvedSessionId) return
		const p = typeof promptParam === 'string' ? promptParam : undefined
		const st = typeof shareTokenParam === 'string' ? shareTokenParam : undefined
		if (!p && !st) return

		let cancelled = false
		let clearFrameId = 0
		const frameId = window.requestAnimationFrame(() => {
			if (cancelled) return

			void navigate.refineCurrent(`/ai/chat/${resolvedSessionId}`)
			clearFrameId = window.requestAnimationFrame(() => {})
		})

		return () => {
			cancelled = true
			window.cancelAnimationFrame(frameId)
			window.cancelAnimationFrame(clearFrameId)
		}
	}, [router.isReady, promptParam, shareTokenParam, resolvedSessionId, navigate])

	if (loaders.userLoading || user) return null

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

SessionPage.getLayout = LlamaAIShell.getLayout

export default SessionPage
