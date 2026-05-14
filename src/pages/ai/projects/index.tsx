import * as Ariakit from '@ariakit/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { LlamaAIShell } from '~/containers/LlamaAI/LlamaAIShell'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { useIsClient } from '~/hooks/useIsClient'

export default function ProjectsIndexPage() {
	const isClient = useIsClient()
	const { user, loaders } = useAuthContext()
	const signInDialogStore = Ariakit.useDialogStore()
	const router = useRouter()
	const queryClient = useQueryClient()

	useEffect(() => {
		if (!router.isReady) return
		if (router.query.ghInstalled === '1') {
			toast.success('GitHub app installed — pick a repo to connect.')
			void queryClient.invalidateQueries({ queryKey: ['github', 'installations'] })
			const { ghInstalled: _drop, ...rest } = router.query
			void router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true })
		}
	}, [router, queryClient])

	if (!isClient || loaders.userLoading) {
		return null
	}

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

ProjectsIndexPage.getLayout = LlamaAIShell.getLayout
