import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useGetCreditsUsage, useGetCurrentKey, useIsSubscribed, useSignInWithEthereum } from './queries'
import { useEffect, useRef } from 'react'
import { llamaAddress, proSubscriptionAmount, supporterSubscriptionAmount } from '../ProApi/lib/constants'
import { Tooltip, TooltipAnchor, useTooltipState } from 'ariakit'
import { Icon } from '~/components/Icon'

// TODO handle sub top ups
export const PayWithCrypto = ({ pro }: { pro: boolean }) => {
	const { isConnected } = useAccount()
	const { openConnectModal } = useConnectModal()
	const { data: isSubscribed, refetch: refetchSubStatus, isRefetching: isRefetchingSubStatus } = useIsSubscribed()
	const intervalRef = useRef<NodeJS.Timeout>()

	const startPayment = (isTopUp = false) => {
		window.open(
			`https://subscriptions.llamapay.io/subscribe?to=${llamaAddress}&amount=${
				pro ? proSubscriptionAmount : supporterSubscriptionAmount
			}&brandColor=%232351be&closeAfterPayment=true`,
			'Window',
			`width=600,height=800,left=${window.screen.width / 2 - 300},top=${window.screen.height / 2 - 400}`
		)

		window.addEventListener('message', function (e) {
			if (e.data === 'payment_success' && !isTopUp) {
				intervalRef.current = setInterval(() => refetchSubStatus(), 500)
			}
		})
	}

	useEffect(() => {
		return () => {
			if (intervalRef.current && isSubscribed) {
				clearInterval(intervalRef.current)
			}
		}
	}, [isSubscribed])

	if (!isConnected) {
		return (
			<button
				onClick={() => openConnectModal()}
				className={`font-medium rounded-lg border border-[#39393E] bg-[#5C5CF9] py-[14px] flex-1 text-center mx-auto ${
					pro ? 'shadow-[0px_0px_32px_0px_#5C5CF980]' : ''
				} flex items-center gap-1 justify-center flex-nowrap`}
			>
				<Icon name="wallet" height={16} width={16} />
				<span>Pay with Crypto</span>
			</button>
		)
	}

	return (
		<>
			<button
				onClick={() => startPayment()}
				className={`font-medium rounded-lg border border-[#39393E] bg-[#5C5CF9] py-[14px] flex-1 text-center mx-auto ${
					pro ? 'shadow-[0px_0px_32px_0px_#5C5CF980]' : ''
				} disabled:cursor-not-allowed flex items-center gap-1 justify-center flex-nowrap`}
			>
				{isRefetchingSubStatus ? (
					'Checking...'
				) : (
					<>
						<Icon name="wallet" height={16} width={16} />
						<span>Pay with Crypto</span>
					</>
				)}
			</button>
		</>
	)
}

export const ProApiKey = () => {
	const { mutate, isPending, error } = useSignInWithEthereum()
	const { data, isLoading, error: errorFetchingCurrentKey } = useGetCurrentKey()
	const { data: creditUsage } = useGetCreditsUsage({ apiKey: data?.apiKey })
	const tooltip = useTooltipState({ timeout: 0 })
	return (
		<>
			{data ? (
				<div className="flex flex-col overflow-x-auto mb-9">
					<table className="border-collapse mx-auto">
						<tbody>
							<tr>
								<th className="p-2 border border-[#39393E] font-normal whitespace-nowrap">API Key</th>
								<td className="p-2 border border-[#39393E]">{data.apiKey}</td>
							</tr>
							<tr>
								<th className="p-2 border border-[#39393E] font-normal whitespace-nowrap min-w-[88px]">
									<TooltipAnchor state={tooltip} className="flex flex-nowrap items-center justify-center gap-1">
										<span className="whitespace-nowrap">Calls Left</span>{' '}
										<Icon name="circle-help" height={16} width={16} />
									</TooltipAnchor>
									<Tooltip
										state={tooltip}
										className="bg-black border border-[#39393E] rounded-2xl relative z-10 p-4 max-w-sm text-sm"
									>
										Amount of calls that you can make before this api key runs out of credits. This limit will be reset
										at the end of each natural month.
									</Tooltip>
								</th>
								<td className="p-2 border border-[#39393E]">{creditUsage?.creditsLeft}</td>
							</tr>
						</tbody>
					</table>
				</div>
			) : isLoading ? (
				<p className="text-center">Fetching api key...</p>
			) : (
				<>
					<button
						onClick={() => mutate()}
						disabled={isPending || isLoading}
						className="font-medium rounded-lg border border-[#39393E] bg-[#5C5CF9] py-[14px] w-full max-w-[200px] text-center mx-auto shadow-[0px_0px_32px_0px_#5C5CF980] disabled:cursor-not-allowed"
					>
						{isPending ? 'Signing in...' : 'Sign In With Ethereum'}
					</button>
					{error ? <p className="text-sm text-center text-red-500">{error.message}</p> : null}
				</>
			)}
			{errorFetchingCurrentKey ? (
				<p className="text-sm text-center text-red-500">{errorFetchingCurrentKey.message}</p>
			) : null}
		</>
	)
}
