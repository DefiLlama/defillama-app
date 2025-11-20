import { useState } from 'react'
import * as Ariakit from '@ariakit/react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { StripeCheckoutModal } from '~/components/StripeCheckoutModal'
import { SubscribeAPICard } from '~/components/SubscribeCards/SubscribeAPICard'
import { SubscribeEnterpriseCard } from '~/components/SubscribeCards/SubscribeEnterpriseCard'
import { SubscribeProCard } from '~/components/SubscribeCards/SubscribeProCard'
import { Subscription, useSubscribe } from '~/hooks/useSubscribe'

interface SubscriberContentProps {
	apiKey: string | null
	isApiKeyLoading: boolean
	generateNewKey: () => void
	credits: number | null
	isCreditsLoading: boolean
	subscription: Subscription
	createPortalSession: (type: 'llamafeed' | 'api') => Promise<string | null>
	isPortalSessionLoading: boolean
	apiSubscription: Subscription
	llamafeedSubscription: Subscription
	legacySubscription: Subscription
	enableOverage: () => void
	isEnableOverageLoading: boolean
}

export const SubscriberContent = ({
	apiKey,
	isApiKeyLoading,
	generateNewKey,
	credits,
	isCreditsLoading,
	subscription,
	createPortalSession,
	isPortalSessionLoading,
	apiSubscription,
	llamafeedSubscription,
	enableOverage,
	isEnableOverageLoading
}: SubscriberContentProps) => {
	const isLlamaFeed = llamafeedSubscription?.status === 'active'
	const isPro = apiSubscription?.status === 'active' && apiSubscription?.provider !== 'legacy'
	const isLegacy = apiSubscription?.status === 'active' && apiSubscription?.provider === 'legacy'
	const creditsLimit = isLlamaFeed ? 0 : 1_000_000
	const { loading } = useSubscribe()

	const currentSubscription = isLlamaFeed ? llamafeedSubscription : isPro ? apiSubscription : null
	const currentBillingInterval = currentSubscription?.billing_interval
	const [billingInterval, setBillingInterval] = useState<'year' | 'month'>(currentBillingInterval || 'month')
	const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
	const [upgradeType, setUpgradeType] = useState<'api' | 'llamafeed' | null>(null)

	const monthlyPricePro = 49
	const yearlyPricePro = monthlyPricePro * 10
	const monthlyPriceAPI = 300
	const yearlyPriceAPI = monthlyPriceAPI * 10

	const displayPrice = isLlamaFeed
		? currentBillingInterval === 'year'
			? `$${yearlyPricePro}.00 USD`
			: `$${monthlyPricePro}.00 USD`
		: isPro
			? currentBillingInterval === 'year'
				? `$${yearlyPriceAPI}.00 USD`
				: `$${monthlyPriceAPI}.00 USD`
			: ''

	async function handleManageSubscription(type: 'llamafeed' | 'api') {
		const sub = type === 'llamafeed' ? llamafeedSubscription : apiSubscription
		if (sub?.provider === 'stripe') {
			await createPortalSession(type)
		} else {
			window.open('https://subscriptions.llamapay.io/', '_blank')
		}
	}

	return (
		<>
			<div className="mb-3 flex flex-col items-center sm:mb-4">
				<span className="mb-1 text-lg font-semibold text-white sm:text-xl">Change Subscription</span>
			</div>
			<div className="relative z-10 mb-4 flex items-center justify-center sm:mb-6">
				<div className="relative inline-flex items-center rounded-lg bg-[#22242930] p-1 backdrop-blur-sm sm:rounded-xl">
					<button
						onClick={() => setBillingInterval('month')}
						className={`relative z-10 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 sm:rounded-lg sm:px-6 sm:py-2 ${
							billingInterval === 'month'
								? 'bg-[#5C5CF9] text-white shadow-lg shadow-[#5C5CF9]/20'
								: 'text-[#8a8c90] hover:text-white'
						}`}
					>
						Monthly
					</button>
					{/* <button
						onClick={() => setBillingInterval('year')}
						className={`relative z-10 flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 sm:gap-2 sm:rounded-lg sm:px-6 sm:py-2 ${
							billingInterval === 'year'
								? 'bg-[#5C5CF9] text-white shadow-lg shadow-[#5C5CF9]/20'
								: 'text-[#8a8c90] hover:text-white'
						}`}
					>
						Yearly
						<span className="rounded-md bg-[#7B7BFF] px-1.5 py-0.5 text-xs font-semibold text-white sm:px-2">
							2 months free
						</span>
					</button> */}
				</div>
			</div>
			<div className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:gap-4 md:grid-cols-3">
				<div className="relative flex flex-col overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] px-4 py-6 shadow-md backdrop-blur-md transition-all duration-300 md:px-5 md:py-8 md:hover:scale-[1.02]">
					<SubscribeProCard
						context="account"
						active={isLlamaFeed && subscription?.provider !== 'trial'}
						onCancelSubscription={isLlamaFeed ? () => handleManageSubscription('llamafeed') : undefined}
						currentBillingInterval={llamafeedSubscription?.billing_interval}
						billingInterval={billingInterval}
						// hasApiSubscription={isPro || isLegacy}
					/>
				</div>
				<div className="relative flex flex-col overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] px-4 py-6 shadow-md backdrop-blur-md transition-all duration-300 md:px-5 md:py-8 md:hover:scale-[1.02]">
					<SubscribeAPICard
						context="account"
						active={isPro || isLegacy}
						onCancelSubscription={isPro ? () => handleManageSubscription('api') : undefined}
						isLegacyActive={isLegacy}
						currentBillingInterval={apiSubscription?.billing_interval}
						billingInterval={billingInterval}
					/>
				</div>
				<div className="relative flex flex-col overflow-hidden rounded-xl border border-[#4a4a50] bg-[#22242930] px-4 py-6 shadow-md backdrop-blur-md transition-all duration-300 md:px-5 md:py-8 md:hover:scale-[1.02]">
					<h2 className="text-center text-xl font-extrabold whitespace-nowrap sm:text-[2rem]">Enterprise</h2>
					<span className="h-6 sm:h-8"></span>
					<span className="h-5 sm:h-7"></span>
					<SubscribeEnterpriseCard active={subscription?.type === 'enterprise'} />
				</div>
			</div>

			{(isPro || isLegacy) && (
				<div className="relative overflow-hidden rounded-xl border border-[#39393E] bg-linear-to-b from-[#222429] to-[#1d1f24] shadow-xl">
					<div className="absolute -inset-1 -z-10 bg-linear-to-r from-[#5C5EFC]/20 to-[#462A92]/20 opacity-70 blur-[100px]"></div>

					<div className="border-b border-[#39393E]/40 p-4 sm:p-6">
						<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
							<div className="flex items-center gap-2.5 sm:gap-3">
								<div className="relative">
									<div className="relative rounded-lg bg-[#5C5CF9]/10 p-2 text-[#5C5CF9] sm:p-2.5">
										<Icon name="file-plus" height={18} width={18} className="sm:h-5 sm:w-5" />
									</div>
								</div>
								<div>
									<h3 className="text-lg font-bold sm:text-xl">API Access</h3>
									<p className="text-xs text-[#b4b7bc] sm:text-sm">Manage your Pro API integration</p>
								</div>
							</div>
							<a
								href="https://api-docs.defillama.com/"
								target="_blank"
								rel="noreferrer noopener"
								className="flex items-center justify-center gap-2 rounded-lg bg-[#5C5CF9]/10 px-3 py-2 text-xs font-medium text-[#5C5CF9] transition-colors hover:bg-[#5C5CF9]/20 sm:px-4 sm:text-sm"
								aria-label="View API documentation"
							>
								<Icon name="file-text" height={12} width={12} className="sm:h-3.5 sm:w-3.5" />
								<span>API Documentation</span>
							</a>
						</div>
					</div>

					<div className="p-4 sm:p-6">
						{isApiKeyLoading ? (
							<div className="flex flex-col items-center justify-center py-8 sm:py-12">
								<div className="relative mb-4 h-14 w-14">
									<div className="absolute inset-0 h-full w-full rounded-full border-4 border-[#5C5CF9]/30"></div>
									<div className="absolute inset-0 h-full w-full animate-spin rounded-full border-4 border-transparent border-t-[#5C5CF9]"></div>
								</div>
								<p className="text-[#b4b7bc]">Fetching your API credentials...</p>
							</div>
						) : apiKey ? (
							<div className="space-y-6">
								<div className="overflow-hidden rounded-lg border border-[#39393E] bg-linear-to-r from-[#1a1b1f] to-[#1a1b1f]/80">
									<div className="flex items-center justify-between border-b border-[#39393E]/60 p-4">
										<h4 className="flex items-center gap-2 font-medium">
											<Icon name="file-plus" height={16} width={16} className="text-[#5C5CF9]" />
											Your API Key
										</h4>
										<div className="flex items-center gap-1">
											<button
												className="group rounded-lg p-2 text-[#5C5CF9] transition-colors hover:bg-[#5C5CF9]/5 hover:text-[#4A4AF0]"
												onClick={() => {
													navigator.clipboard.writeText(apiKey)
													toast.success('API key copied to clipboard')
												}}
												aria-label="Copy API key to clipboard"
											>
												<Icon
													name="copy"
													height={16}
													width={16}
													className="transition-transform group-hover:scale-110"
												/>
											</button>
											<button
												onClick={generateNewKey}
												className="group flex items-center gap-1.5 rounded-lg p-2 text-sm text-[#5C5CF9] transition-colors hover:bg-[#5C5CF9]/5 hover:text-[#4A4AF0]"
												disabled={isApiKeyLoading}
												aria-label="Regenerate API key"
											>
												<Icon
													name="repeat"
													height={14}
													width={14}
													className={isApiKeyLoading ? 'animate-spin' : 'transition-transform group-hover:rotate-90'}
												/>
												<span>Regenerate</span>
											</button>
										</div>
									</div>

									<div className="group relative p-4">
										<div className="rounded-lg border border-[#39393E]/60 bg-linear-to-r from-[#13141a] to-[#181a1f] p-3 font-mono text-sm break-all">
											<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#181a1f]/90 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
												<button
													onClick={() => {
														navigator.clipboard.writeText(apiKey)
														toast.success('API key copied to clipboard')
													}}
													className="flex items-center gap-2 rounded-lg bg-[#5C5CF9] px-4 py-2 text-white shadow-lg"
												>
													<Icon name="copy" height={16} width={16} />
													<span>Copy Key</span>
												</button>
											</div>
											{apiKey}
										</div>
									</div>
								</div>

								<div className="rounded-lg border border-[#39393E] bg-linear-to-r from-[#1a1b1f] to-[#1a1b1f]/80 p-5">
									<div className="mb-5 flex items-center justify-between">
										<h4 className="font-medium">Usage Dashboard</h4>
										<span className="rounded-full bg-[#5C5CF9]/10 px-3 py-1 text-xs text-[#5C5CF9]">
											Current Billing Cycle
										</span>
									</div>

									<div className="grid gap-6 md:grid-cols-2">
										<div>
											<div className="mb-2 flex items-center justify-between">
												<div className="flex items-center gap-1.5">
													<Icon name="pie-chart" height={14} width={14} className="text-[#5C5CF9]" />
													<span className="text-sm">API Calls</span>
													<Ariakit.TooltipProvider timeout={0}>
														<Ariakit.TooltipAnchor>
															<Icon name="circle-help" height={12} width={12} className="text-[#8a8c90]" />
														</Ariakit.TooltipAnchor>
														<Ariakit.Tooltip className="max-w-xs rounded-lg border border-[#39393E] bg-black p-3 text-xs shadow-xl">
															Number of API calls remaining in the current billing cycle.
														</Ariakit.Tooltip>
													</Ariakit.TooltipProvider>
												</div>
												<div className="flex items-baseline gap-1">
													{isCreditsLoading ? (
														<span className="text-xs text-[#8a8c90]">Loading...</span>
													) : credits ? (
														<>
															<span className="font-semibold text-white">{credits}</span>
															<span className="text-xs text-[#8a8c90]">/ {creditsLimit.toLocaleString()}</span>
														</>
													) : (
														<span className="text-xs text-[#8a8c90]">No calls available</span>
													)}
												</div>
											</div>

											<div className="mb-2 h-3 overflow-hidden rounded-full bg-[#39393E]/20">
												{credits && (
													<div
														className={`relative h-full w-[${((credits / creditsLimit) * 100).toFixed(
															1
														)}%] bg-linear-to-r from-[#5C5CF9]/80 to-[#5842C3]`}
													>
														<div className="animate-shimmer absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(92,92,249,0.4)_50%,transparent_75%)] bg-size-[1rem_1rem]"></div>
													</div>
												)}
											</div>

											<div className="flex items-center justify-between text-xs text-[#8a8c90]">
												<span>{credits ? `${credits.toLocaleString()} remaining` : 'No calls available'}</span>
												<span>{credits ? `${((credits / creditsLimit) * 100).toFixed(1)}% remaining` : '-'}</span>
											</div>
										</div>

										<div>
											<div className="mb-2 flex items-center justify-between">
												<div className="flex items-center gap-1.5">
													<Icon name="pie-chart" height={14} width={14} className="text-[#5C5CF9]" />
													<span className="text-sm">Rate Limit</span>
												</div>
												<div className="flex items-baseline gap-1">
													<span className="font-semibold text-white">{isPro ? '1,000' : '0'}</span>
													<span className="text-xs text-[#8a8c90]">requests/minute</span>
												</div>
											</div>

											<div className="mb-2 h-3 overflow-hidden rounded-full bg-[#39393E]/20">
												<div className="relative h-full w-full bg-linear-to-r from-[#5C5CF9]/80 to-[#5842C3]">
													<div className="animate-shimmer absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(92,92,249,0.4)_50%,transparent_75%)] bg-size-[1rem_1rem]"></div>
												</div>
											</div>

											<div className="flex items-center justify-between text-xs text-[#8a8c90]">
												<span>{isPro ? 'Pro' : isLlamaFeed ? 'Pro' : ''}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						) : (
							<div className="space-y-6 py-8 text-center">
								<div className="mx-auto max-w-md">
									<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#5C5CF9]/10 p-3 text-[#5C5CF9]">
										<Icon name="file-plus" height={24} width={24} />
									</div>
									<h4 className="mb-2 text-lg font-semibold">Generate Your API Key</h4>
									<p className="mb-6 text-[#b4b7bc]">
										Create your unique API key to start integrating Pro data into your applications and dashboards.
									</p>
								</div>

								<button
									onClick={generateNewKey}
									className="group relative mx-auto flex items-center gap-2 rounded-lg bg-linear-to-r from-[#5C5CF9] to-[#5842C3] px-6 py-3.5 font-medium text-white shadow-lg transition-colors hover:from-[#4A4AF0] hover:to-[#4335A8]"
									disabled={isApiKeyLoading}
								>
									{isApiKeyLoading ? (
										<>
											<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
											<span>Generating...</span>
										</>
									) : (
										<>
											<Icon
												name="file-plus"
												height={16}
												width={16}
												className="transition-transform group-hover:scale-110"
											/>
											<span>Generate API Key</span>
										</>
									)}
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{(isPro || isLlamaFeed) && (
				<div className="overflow-hidden rounded-xl border border-[#39393E] bg-linear-to-b from-[#222429] to-[#1d1f24] shadow-lg">
					<div className="border-b border-[#39393E]/40 p-4 sm:p-6">
						<div className="flex items-center gap-2.5 sm:gap-3">
							<div className="relative">
								<div className="relative rounded-lg bg-[#5C5CF9]/10 p-2 text-[#5C5CF9] sm:p-2.5">
									<Icon name="card" height={18} width={18} className="sm:h-5 sm:w-5" />
								</div>
							</div>
							<div>
								<h3 className="text-lg font-bold sm:text-xl">Subscription</h3>
								<p className="text-xs text-[#b4b7bc] sm:text-sm">
									Manage your <span className="font-bold">{isLlamaFeed ? 'Pro' : isPro ? 'API' : ''}</span> subscription
									details
								</p>
							</div>
						</div>
					</div>

					<div className="p-4 sm:p-6">
						<div className="space-y-4 sm:space-y-6">
							<div className="rounded-lg border border-[#39393E] bg-linear-to-r from-[#1a1b1f] to-[#1a1b1f]/80 p-4 sm:p-5">
								<div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
									<h4 className="flex items-center gap-2 text-sm font-medium sm:text-base">
										<Icon name="bookmark" height={14} width={14} className="text-[#5C5CF9] sm:h-4 sm:w-4" />
										<span>{isLlamaFeed ? 'Pro' : isPro ? 'API' : ''} Plan</span>
									</h4>
									<div className="flex items-center gap-3 sm:gap-4">
										<div className="flex items-center gap-2">
											<span className="h-2 w-2 rounded-full bg-green-400"></span>
											<span className="text-xs font-medium text-white sm:text-sm">Active</span>
										</div>
										<button
											onClick={
												isLlamaFeed
													? () => handleManageSubscription('llamafeed')
													: isPro
														? () => handleManageSubscription('api')
														: undefined
											}
											disabled={isPortalSessionLoading}
											className="flex items-center gap-1.5 rounded-lg bg-[#5C5CF9]/10 px-3 py-1.5 text-xs font-medium text-[#5C5CF9] transition-colors hover:bg-[#5C5CF9]/20 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
										>
											{isPortalSessionLoading ? (
												<>
													<span className="h-3 w-3 animate-spin rounded-full border-2 border-[#5C5CF9]/30 border-t-[#5C5CF9]"></span>
													<span className="hidden sm:inline">Loading...</span>
												</>
											) : (
												<>
													<Icon name="settings" height={12} width={12} className="sm:h-3.5 sm:w-3.5" />
													<span className="hidden sm:inline">Manage Subscription</span>
													<span className="sm:hidden">Manage</span>
												</>
											)}
										</button>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-4">
									<div className="rounded-lg bg-[#13141a]/60 p-2.5 sm:p-3">
										<p className="mb-1 text-xs text-[#8a8c90]">Billing Cycle</p>
										<p className="text-sm font-medium sm:text-base">
											{currentBillingInterval === 'year' ? 'Yearly' : 'Monthly'}
										</p>
									</div>

									<div className="rounded-lg bg-[#13141a]/60 p-2.5 sm:p-3">
										<p className="mb-1 text-xs text-[#8a8c90]">Price</p>
										<p className="text-sm font-medium sm:text-base">{displayPrice}</p>
									</div>

									<div className="col-span-2 rounded-lg bg-[#13141a]/60 p-2.5 sm:p-3 md:col-span-1">
										<p className="mb-1 text-xs text-[#8a8c90]">Next billing date</p>
										<p className="text-sm font-medium sm:text-base">
											{isLlamaFeed && llamafeedSubscription?.expires_at
												? new Date(+llamafeedSubscription.expires_at * 1000).toLocaleDateString('en-US', {
														month: 'short',
														day: 'numeric',
														year: 'numeric'
													})
												: isPro && apiSubscription?.expires_at
													? new Date(+apiSubscription.expires_at * 1000).toLocaleDateString('en-US', {
															month: 'short',
															day: 'numeric',
															year: 'numeric'
														})
													: 'Not available'}
										</p>
									</div>
								</div>

								{/* {isLlamaFeed &&
									(llamafeedSubscription?.billing_interval === 'month' || !llamafeedSubscription?.billing_interval) && (
										<div className="mt-4 rounded-lg border border-[#39393E] bg-linear-to-r from-[#1a1b1f] to-[#1a1b1f]/80 p-4 sm:mt-6 sm:p-5">
											<div className="mb-3 flex items-start gap-2.5 sm:mb-4 sm:gap-3">
												<div className="rounded-lg bg-[#5C5CF9]/10 p-1.5 text-[#5C5CF9] sm:p-2">
													<Icon name="trending-up" height={18} width={18} className="sm:h-5 sm:w-5" />
												</div>
												<div className="flex-1">
													<h4 className="mb-1 text-sm font-medium sm:text-base">Upgrade Pro to Yearly</h4>
													<p className="text-xs text-[#8a8c90] sm:text-sm">
														Switch to annual billing and save 2 months.
													</p>
												</div>
											</div>
											<button
												onClick={() => {
													setUpgradeType('llamafeed')
													setIsUpgradeModalOpen(true)
												}}
												disabled={loading === 'stripe'}
												className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5C5CF9] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4A4AF0] disabled:cursor-not-allowed disabled:opacity-70 sm:py-3"
											>
												{loading === 'stripe' ? (
													<>
														<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
														<span>Processing...</span>
													</>
												) : (
													<>
														<Icon name="arrow-up" height={14} width={14} className="sm:h-4 sm:w-4" />
														<span className="hidden sm:inline">Upgrade to Yearly (Save 2 Months)</span>
														<span className="sm:hidden">Upgrade to Yearly</span>
													</>
												)}
											</button>
										</div>
									)}

								{isPro && (apiSubscription?.billing_interval === 'month' || !apiSubscription?.billing_interval) && (
									<div className="mt-4 rounded-lg border border-[#39393E] bg-linear-to-r from-[#1a1b1f] to-[#1a1b1f]/80 p-4 sm:mt-6 sm:p-5">
										<div className="mb-3 flex items-start gap-2.5 sm:mb-4 sm:gap-3">
											<div className="rounded-lg bg-[#5C5CF9]/10 p-1.5 text-[#5C5CF9] sm:p-2">
												<Icon name="trending-up" height={18} width={18} className="sm:h-5 sm:w-5" />
											</div>
											<div className="flex-1">
												<h4 className="mb-1 text-sm font-medium sm:text-base">Upgrade API to Yearly</h4>
												<p className="text-xs text-[#8a8c90] sm:text-sm">Switch to annual billing and save 2 months.</p>
											</div>
										</div>
										<button
											onClick={() => {
												setUpgradeType('api')
												setIsUpgradeModalOpen(true)
											}}
											disabled={loading === 'stripe'}
											className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5C5CF9] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4A4AF0] disabled:cursor-not-allowed disabled:opacity-70 sm:py-3"
										>
											{loading === 'stripe' ? (
												<>
													<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
													<span>Processing...</span>
												</>
											) : (
												<>
													<Icon name="arrow-up" height={14} width={14} className="sm:h-4 sm:w-4" />
													<span className="hidden sm:inline">Upgrade to Yearly (Save 2 Months)</span>
													<span className="sm:hidden">Upgrade to Yearly</span>
												</>
											)}
										</button>
									</div>
								)} */}

								{isPro && !apiSubscription?.overage && (
									<div className="mt-4 rounded-lg border border-[#39393E] bg-linear-to-r from-[#1a1b1f] to-[#1a1b1f]/80 p-4 sm:mt-6 sm:p-5">
										<div className="mb-3 flex items-start gap-2.5 sm:mb-4 sm:gap-3">
											<div className="rounded-lg bg-[#5C5CF9]/10 p-1.5 text-[#5C5CF9] sm:p-2">
												<Icon name="trending-up" height={18} width={18} className="sm:h-5 sm:w-5" />
											</div>
											<div className="flex-1">
												<h4 className="mb-1 text-sm font-medium sm:text-base">Enable Overage</h4>
												<p className="text-xs text-[#8a8c90] sm:text-sm">
													Continue API calls beyond 1M/month at $0.60 per 1,000 calls.
												</p>
											</div>
										</div>
										<button
											onClick={enableOverage}
											disabled={isEnableOverageLoading}
											className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5C5CF9]/10 px-4 py-2 text-xs font-medium text-[#5C5CF9] transition-colors hover:bg-[#5C5CF9]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
										>
											{isEnableOverageLoading ? (
												<>
													<span className="h-3 w-3 animate-spin rounded-full border-2 border-[#5C5CF9]/30 border-t-[#5C5CF9]"></span>
													<span>Enabling...</span>
												</>
											) : (
												<>
													<Icon name="check" height={12} width={12} className="sm:h-3.5 sm:w-3.5" />
													<span>Enable Overage</span>
												</>
											)}
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{isUpgradeModalOpen && upgradeType && (
				<StripeCheckoutModal
					isOpen={isUpgradeModalOpen}
					onClose={() => {
						setIsUpgradeModalOpen(false)
						setUpgradeType(null)
					}}
					paymentMethod="stripe"
					type={upgradeType}
					billingInterval="year"
				/>
			)}
		</>
	)
}
