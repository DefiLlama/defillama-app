import * as Ariakit from '@ariakit/react'
import { useState, useEffect } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { AUTH_SERVER } from '~/constants'
import { Tooltip as CustomTooltip } from '~/components/Tooltip'
import { StyledButton } from '~/components/ButtonStyled/StyledButton'

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
	const shadowClass = type === 'api' && !isStripe ? 'shadow-[0px_0px_32px_0px_#5C5CF980]' : ''

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
			<StyledButton
				onClick={() => handleSubscribe(paymentMethod, type)}
				disabled={disabled}
				className={shadowClass}
				iconName={icon}
			>
				{text}
			</StyledButton>
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
					console.error('Error fetching API key:', error)
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
			console.error('Error generating API key:', error)
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
					<div className="flex flex-col overflow-x-auto mb-9">
						<table className="border-collapse mx-auto">
							<tbody>
								<tr>
									<th className="p-2 border border-[#39393E] font-normal whitespace-nowrap">API Key</th>
									<td className="p-2 border border-[#39393E]">{apiKey}</td>
								</tr>
								<tr>
									<th className="p-2 border border-[#39393E] font-normal whitespace-nowrap min-w-[88px]">
										<Ariakit.TooltipProvider timeout={0}>
											<Ariakit.TooltipAnchor className="flex flex-nowrap items-center justify-center gap-1">
												<span className="whitespace-nowrap">Calls Left</span>{' '}
												<Icon name="circle-help" height={16} width={16} />
											</Ariakit.TooltipAnchor>
											<Ariakit.Tooltip className="bg-black border border-[#39393E] rounded-2xl relative z-10 p-4 max-w-sm text-sm">
												Amount of calls that you can make before this api key runs out of credits. This limit will be
												reset at the end of each natural month.
											</Ariakit.Tooltip>
										</Ariakit.TooltipProvider>
									</th>
									<td className="p-2 border border-[#39393E]">{creditsLeft}</td>
								</tr>
								<tr>
									<th className="p-2 border border-[#39393E] font-normal whitespace-nowrap">Subscription</th>
									<td className="p-2 border border-[#39393E]">
										{subscription?.status === 'active' ? 'Active' : 'Inactive'}
									</td>
								</tr>
								{subscription?.expires_at && (
									<tr>
										<th className="p-2 border border-[#39393E] font-normal whitespace-nowrap">Expires</th>
										<td className="p-2 border border-[#39393E]">
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
							className="font-medium rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] py-2 px-4 text-white hover:bg-[#4A4AF0] transition-all duration-200"
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
