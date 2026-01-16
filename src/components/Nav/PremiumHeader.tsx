import { useEffect, useState } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'

export const PremiumHeader = () => {
	const { hasActiveSubscription, isAuthenticated, loaders } = useAuthContext()
	const [hasMounted, setHasMounted] = useState(false)

	useEffect(() => {
		setHasMounted(true)
	}, [])

	// Only show badge after hydration AND when we're sure user doesn't have subscription
	const showFreeTrial = hasMounted && !hasActiveSubscription && (!isAuthenticated || !loaders.userLoading)

	return (
		<>
			<hr className="my-2 -ml-1.5 border-black/20 max-lg:hidden dark:border-white/20" />
			<p className="mb-1 flex items-center gap-2">
				<span className="text-xs font-medium tracking-wide opacity-65">PREMIUM</span>
				<span
					className={`relative inline-flex items-center rounded-full border border-[#C99A4A]/50 bg-gradient-to-r from-[#C99A4A]/15 via-[#C99A4A]/5 to-[#C99A4A]/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#996F1F] shadow-[0_0_8px_rgba(201,154,74,0.3)] dark:border-[#FDE0A9]/50 dark:from-[#FDE0A9]/20 dark:via-[#FDE0A9]/10 dark:to-[#FDE0A9]/20 dark:text-[#FDE0A9] dark:shadow-[0_0_8px_rgba(253,224,169,0.25)] ${showFreeTrial ? '' : 'invisible'}`}
				>
					Try free
				</span>
			</p>
		</>
	)
}
