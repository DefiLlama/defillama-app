import { useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Toast } from '~/components/Toast'
import { AuthProvider, useAuthContext } from '~/containers/Subscribtion/auth'
import { SignIn } from '~/containers/Subscribtion/SignIn'
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

	useEffect(() => {
		if (isAuthenticated && redirectUrl) {
			console.log('hi')
			router.push({
				pathname: redirectUrl as string,
				query: { ...router.query, data: 'data' }
			})
		}
	}, [isAuthenticated, redirectUrl, router, user])

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
								<svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<h2 className="mb-2 text-2xl font-bold text-white">Successfully Logged In</h2>
							{user?.email && <p className="text-sm text-[#8a8c90]">Signed in as {user.email}</p>}
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
					<SignIn onlyUseDialog={true} />
				)}
				<Toast />
			</div>
		</>
	)
}
