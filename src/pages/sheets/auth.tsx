import { useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { Toast } from '~/components/Toast'
import { AuthProvider, useAuthContext } from '~/containers/Subscribtion/auth'
import { SignIn } from '~/containers/Subscribtion/SignIn'
import { useSubscribe } from '~/hooks/useSubscribe'
import { WalletProvider } from '~/layout/WalletProvider'

export default function AuthPage() {
	return (
		<WalletProvider>
			<AuthProvider>
				<AuthContent />
			</AuthProvider>
		</WalletProvider>
	)
}

function AuthContent() {
	const router = useRouter()
	const { isAuthenticated, logout, user } = useAuthContext()
	const redirectUrl = router.query.redirect_uri

	const { subscription, isSubscriptionLoading } = useSubscribe()

	useEffect(() => {
		if (isAuthenticated && redirectUrl && !isSubscriptionLoading) {
			router.push({
				pathname: redirectUrl as string,
				query: {
					...router.query,
					subscription_id: subscription?.id || '',
					subscription_status: subscription?.status || '',
					expires_at: subscription?.expires_at || '',
					provider: subscription?.provider || ''
				}
			})
		}
	}, [isAuthenticated, redirectUrl, router, user, isSubscriptionLoading, subscription])

	return (
		<>
			<Head>
				<title>Sign In - DefiLlama</title>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
				<meta name="robots" content="noindex, nofollow" />
			</Head>
			<div className="flex min-h-screen w-full items-center justify-center bg-[#13141a] px-5">
				{isAuthenticated ? (
					<div className="w-full max-w-md rounded-xl border border-[#39393E] bg-[#1a1b1f] p-8 text-center">
						<div className="mb-6">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
								<Icon name="check" height={24} width={24} className="text-green-500" />
							</div>
							<h2 className="mb-2 text-2xl font-bold text-white">Successfully logged in.</h2>
							{user?.email && <p className="text-sm text-[#8a8c90]">Signed in as {user.email}</p>}
							<p className="mt-2 text-sm text-[#8a8c90]">You can close this page.</p>
						</div>

						<div className="space-y-3">
							<button
								onClick={logout}
								className="w-full rounded-lg border border-[#39393E] bg-transparent py-3 font-medium text-white transition-colors hover:bg-[#2a2b30]"
							>
								Sign Out
							</button>
						</div>
					</div>
				) : (
					<SignIn showOnlyAuthDialog />
				)}
				<Toast />
			</div>
		</>
	)
}
