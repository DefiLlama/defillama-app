import { useEffect, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { Tooltip as CustomTooltip } from '~/components/Tooltip'
import { AUTH_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'

export const PaymentButton = ({
	paymentMethod,
	type = 'api'
}: {
	paymentMethod: 'stripe' | 'llamapay'
	type?: 'api' | 'contributor' | 'llamafeed'
}) => {
	const { handleSubscribe, loading } = useSubscribe()
	const { isAuthenticated, user } = useAuthContext()

	const isStripe = paymentMethod === 'stripe'
	const icon = isStripe ? 'card' : 'wallet'
	const text = isStripe ? 'Pay with Card' : 'Pay with Crypto'

	const disabled = loading === paymentMethod || !isAuthenticated || (!user?.verified && !user?.address)
	return (
		<CustomTooltip
			content={
				!isAuthenticated
					? 'Please sign in first to subscribe'
					: !user?.verified && !user?.address
						? 'Please verify your email first to subscribe'
						: null
			}
		>
			<button
				onClick={() => handleSubscribe(paymentMethod, type)}
				disabled={disabled}
				className={`group flex w-full items-center justify-center gap-2 rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] py-3.5 font-medium text-white shadow-xs transition-all duration-200 hover:bg-[#4A4AF0] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#5C5CF9] dark:bg-[#5C5CF9] dark:hover:bg-[#4A4AF0] ${type === 'api' && !isStripe ? 'shadow-[0px_0px_32px_0px_#5C5CF980]' : ''}`}
			>
				{icon && <Icon name={icon} height={16} width={16} />}
				<span className="break-words">{text}</span>
			</button>
		</CustomTooltip>
	)
}

export const ProApiKey = () => {
	const { isAuthenticated, loaders, authorizedFetch } = useAuthContext()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const isSubscribed = subscription?.status === 'active'

	const [apiKey, setApiKey] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		const fetchApiKey = async () => {
			if (isAuthenticated && isSubscribed) {
				setIsLoading(true)
				try {
					const response = await authorizedFetch(`${AUTH_SERVER}/auth/get-api-key`)

					if (response?.ok) {
						const data = await response.json()
						setApiKey(data.result?.key || null)
					}
				} catch (error) {
					console.log('Error fetching API key:', error)
				} finally {
					setIsLoading(false)
				}
			}
		}

		fetchApiKey()
	}, [isAuthenticated, isSubscribed, authorizedFetch])

	const creditsLeft = 1000000

	const generateNewKey = async () => {
		setIsLoading(true)
		try {
			const response = await authorizedFetch(`${AUTH_SERVER}/auth/generate-api-key`, {
				method: 'POST'
			})

			if (response?.ok) {
				const data = await response.json()
				setApiKey(data.result?.key || null)
			}
		} catch (error) {
			console.log('Error generating API key:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<>
			{isAuthenticated && isSubscribed ? (
				isLoading || loaders?.userLoading ? (
					<p className="text-center">Fetching API key...</p>
				) : apiKey ? (
					<div className="mb-9 flex flex-col overflow-x-auto">
						<table className="mx-auto border-collapse">
							<tbody>
								<tr>
									<th className="border border-[#39393E] p-2 font-normal whitespace-nowrap">API Key</th>
									<td className="border border-[#39393E] p-2">{apiKey}</td>
								</tr>
								<tr>
									<th className="min-w-[88px] border border-[#39393E] p-2 font-normal whitespace-nowrap">
										<Ariakit.TooltipProvider timeout={0}>
											<Ariakit.TooltipAnchor className="flex flex-nowrap items-center justify-center gap-1">
												<span className="whitespace-nowrap">Calls Left</span>{' '}
												<Icon name="circle-help" height={16} width={16} />
											</Ariakit.TooltipAnchor>
											<Ariakit.Tooltip className="relative z-10 max-w-sm rounded-2xl border border-[#39393E] bg-black p-4 text-sm">
												Amount of calls that you can make before this api key runs out of credits. This limit will be
												reset at the end of each natural month.
											</Ariakit.Tooltip>
										</Ariakit.TooltipProvider>
									</th>
									<td className="border border-[#39393E] p-2">{creditsLeft}</td>
								</tr>
								<tr>
									<th className="border border-[#39393E] p-2 font-normal whitespace-nowrap">Subscription</th>
									<td className="border border-[#39393E] p-2">
										{subscription?.status === 'active' ? 'Active' : 'Inactive'}
									</td>
								</tr>
								{subscription?.expires_at && (
									<tr>
										<th className="border border-[#39393E] p-2 font-normal whitespace-nowrap">Expires</th>
										<td className="border border-[#39393E] p-2">
											{new Date(subscription.expires_at).toLocaleDateString()}
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				) : (
					<div className="text-center">
						<p className="mb-4">Generate an API key to get started</p>
						<button
							onClick={generateNewKey}
							className="rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] px-4 py-2 font-medium text-white transition-all duration-200 hover:bg-[#4A4AF0]"
							disabled={isLoading}
						>
							{isLoading ? 'Generating...' : 'Generate API Key'}
						</button>
					</div>
				)
			) : (
				<p className="text-center">Please sign in to view your API key</p>
			)}
		</>
	)
}
