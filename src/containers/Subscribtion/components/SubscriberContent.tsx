import * as Ariakit from '@ariakit/react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { SubscribeEnterpriseCard } from '~/components/SubscribeCards/SubscribeEnterpriseCard'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { SubscribeProCard } from '~/components/SubscribeCards/SubscribeProCard'
import { Subscription } from '~/hooks/useSubscribe'

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
	legacySubscription
}: SubscriberContentProps) => {
	const isLlamaFeed = llamafeedSubscription?.status === 'active'
	const isPro = apiSubscription?.status === 'active' && apiSubscription?.provider !== 'legacy'
	const isLegacy = apiSubscription?.status === 'active' && apiSubscription?.provider === 'legacy'
	const creditsLimit = isLlamaFeed ? 0 : 1_000_000

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
			<div className="mb-4 flex flex-col items-center">
				<span className="mb-1 text-xl font-semibold text-white">Change Subscription</span>
			</div>

			<div className="mb-8 flex flex-row justify-center gap-4">
				<SubscribePlusCard
					context="account"
					active={isLlamaFeed && subscription?.provider !== 'trial'}
					onCancelSubscription={isLlamaFeed ? () => handleManageSubscription('llamafeed') : undefined}
				/>
				<SubscribeProCard
					context="account"
					active={isPro || isLegacy}
					onCancelSubscription={isPro ? () => handleManageSubscription('api') : undefined}
					isLegacyActive={isLegacy}
				/>
				<SubscribeEnterpriseCard active={subscription?.type === 'enterprise'} />
			</div>

			{(isPro || isLegacy) && (
				<div className="relative overflow-hidden rounded-xl border border-[#39393E] bg-linear-to-b from-[#222429] to-[#1d1f24] shadow-xl">
					<div className="absolute -inset-1 -z-10 bg-linear-to-r from-[#5C5EFC]/20 to-[#462A92]/20 opacity-70 blur-[100px]"></div>

					<div className="border-b border-[#39393E]/40 p-6">
						<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
							<div className="flex items-center gap-3">
								<div className="relative">
									<div className="relative rounded-lg bg-[#5C5CF9]/10 p-2.5 text-[#5C5CF9]">
										<Icon name="file-plus" height={20} width={20} />
									</div>
								</div>
								<div>
									<h3 className="text-xl font-bold">API Access</h3>
									<p className="text-sm text-[#b4b7bc]">Manage your Pro API integration</p>
								</div>
							</div>
							<a
								href="https://api-docs.defillama.com/"
								target="_blank"
								rel="noreferrer noopener"
								className="flex items-center gap-2 rounded-lg bg-[#5C5CF9]/10 px-4 py-2 text-sm font-medium text-[#5C5CF9] transition-colors hover:bg-[#5C5CF9]/20"
								aria-label="View API documentation"
							>
								<Icon name="file-text" height={14} width={14} />
								<span>API Documentation</span>
							</a>
						</div>
					</div>

					<div className="p-6">
						{isApiKeyLoading ? (
							<div className="flex flex-col items-center justify-center py-12">
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

			<div className="overflow-hidden rounded-xl border border-[#39393E] bg-linear-to-b from-[#222429] to-[#1d1f24] shadow-lg">
				<div className="border-b border-[#39393E]/40 p-6">
					<div className="flex items-center gap-3">
						<div className="relative">
							<div className="relative rounded-lg bg-[#5C5CF9]/10 p-2.5 text-[#5C5CF9]">
								<Icon name="card" height={20} width={20} />
							</div>
						</div>
						<div>
							<h3 className="text-xl font-bold">Subscription</h3>
							<p className="text-sm text-[#b4b7bc]">
								Manage your <span className="font-bold">{isLlamaFeed ? 'Pro' : isPro ? 'API' : ''}</span> subscription
								details
							</p>
						</div>
					</div>
				</div>

				<div className="p-6">
					<div className="space-y-6">
						<div className="rounded-lg border border-[#39393E] bg-linear-to-r from-[#1a1b1f] to-[#1a1b1f]/80 p-5">
							<div className="mb-4 flex items-center justify-between">
								<h4 className="flex items-center gap-2 font-medium">
									<Icon name="bookmark" height={16} width={16} className="text-[#5C5CF9]" />
									<span>{isLlamaFeed ? 'Pro' : isPro ? 'API' : ''} Plan</span>
								</h4>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<span className="h-2 w-2 rounded-full bg-green-400"></span>
										<span className="text-sm font-medium text-white">Active</span>
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
										className="flex items-center gap-2 rounded-lg bg-[#5C5CF9]/10 px-4 py-2 text-sm font-medium text-[#5C5CF9] transition-colors hover:bg-[#5C5CF9]/20"
									>
										{isPortalSessionLoading ? (
											<>
												<span className="h-3 w-3 animate-spin rounded-full border-2 border-[#5C5CF9]/30 border-t-[#5C5CF9]"></span>
												<span>Loading...</span>
											</>
										) : (
											<>
												<Icon name="settings" height={14} width={14} />
												<span>Manage Subscription</span>
											</>
										)}
									</button>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
								<div className="rounded-lg bg-[#13141a]/60 p-3">
									<p className="mb-1 text-xs text-[#8a8c90]">Billing Cycle</p>
									<p className="font-medium">Monthly</p>
								</div>

								<div className="rounded-lg bg-[#13141a]/60 p-3">
									<p className="mb-1 text-xs text-[#8a8c90]">Price</p>
									<p className="font-medium">{isLlamaFeed ? '$49.00 USD' : isPro ? '$300.00 USD' : ''}</p>
								</div>

								<div className="rounded-lg bg-[#13141a]/60 p-3">
									<p className="mb-1 text-xs text-[#8a8c90]">Next billing date</p>
									<p className="font-medium">
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
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
