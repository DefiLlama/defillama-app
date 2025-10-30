import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AccountInfo } from './AccountInfo'
import { LocalLoader } from '~/components/Loaders'
import { useAuthContext } from './auth'
import { useSubscribe } from '~/hooks/useSubscribe'

export function UserAccountPage({ returnUrl }: { returnUrl?: string }) {
	const { isAuthenticated, loaders } = useAuthContext()
	const { isSubscriptionFetching } = useSubscribe()
	const router = useRouter()
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		setIsClient(true)
	}, [])

	useEffect(() => {
		if (isClient && !isAuthenticated && !loaders.userLoading) {
			const redirectUrl = returnUrl ? `/subscription?returnUrl=${encodeURIComponent(returnUrl)}` : '/subscription'
			router.push(redirectUrl)
		}
	}, [isClient, isAuthenticated, loaders.userLoading, returnUrl, router])

	if (loaders && (loaders.userLoading || loaders.userFetching || isSubscriptionFetching)) {
		return (
			<div className="flex h-[60dvh] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	if (!isAuthenticated) {
		return null
	}

	return (
		<div className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 pb-[64px] xl:max-w-7xl 2xl:max-w-[1440px]">
			<div className="mx-auto mt-6 w-full max-w-[1200px]">
				<AccountInfo />
			</div>
		</div>
	)
}

