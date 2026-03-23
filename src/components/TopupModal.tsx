import * as Ariakit from '@ariakit/react'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useCallback, useState } from 'react'
import { Icon } from '~/components/Icon'
import { STRIPE_PUBLISHABLE_KEY } from '~/constants'
import { useCreateTopup, TOPUP_CONFIG } from '~/containers/Subscribtion/useTopup'

const stripeInstance = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

interface TopupModalProps {
	isOpen: boolean
	onClose: () => void
}

export function TopupModal({ isOpen, onClose }: TopupModalProps) {
	const [amount, setAmount] = useState('')
	const [step, setStep] = useState<'select' | 'stripe'>('select')
	const [isRedirecting, setIsRedirecting] = useState(false)
	const topupMutation = useCreateTopup()

	const parsedAmount = parseFloat(amount)
	const isValidAmount =
		Number.isFinite(parsedAmount) && parsedAmount >= TOPUP_CONFIG.minAmount && parsedAmount <= TOPUP_CONFIG.maxAmount

	const handleClose = useCallback(() => {
		setAmount('')
		setStep('select')
		setIsRedirecting(false)
		topupMutation.reset()
		onClose()
	}, [onClose, topupMutation])

	const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/account?topup=success` : ''
	const cancelUrl = typeof window !== 'undefined' ? `${window.location.origin}/account` : ''

	const handleStripe = useCallback(() => {
		if (!isValidAmount) return
		setStep('stripe')
	}, [isValidAmount])

	const fetchClientSecret = useCallback(async (): Promise<string> => {
		const result = await topupMutation.mutateAsync({
			amount: parsedAmount,
			provider: 'stripe',
			redirectUrl,
			cancelUrl
		})
		if (result.provider === 'stripe') return result.clientSecret
		throw new Error('Unexpected response from topup endpoint')
	}, [topupMutation, parsedAmount, redirectUrl, cancelUrl])

	const handleLlamaPay = useCallback(async () => {
		if (!isValidAmount) return
		setIsRedirecting(true)
		try {
			const result = await topupMutation.mutateAsync({
				amount: parsedAmount,
				provider: 'llamapay',
				redirectUrl,
				cancelUrl
			})
			if (result.provider === 'llamapay') {
				window.location.href = result.checkoutUrl
			}
		} catch {
			setIsRedirecting(false)
		}
	}, [isValidAmount, parsedAmount, topupMutation, redirectUrl, cancelUrl])

	const handleAmountInput = (value: string) => {
		const cleaned = value.replace(/[^0-9.]/g, '')
		const parts = cleaned.split('.')
		if (parts.length > 2) return
		if (parts[1] && parts[1].length > 2) return
		setAmount(cleaned)
	}

	const errorMessage = topupMutation.error?.message ?? null

	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={() => handleClose()}>
			<Ariakit.Dialog
				className="dialog gap-0 border border-[#4a4a50]/10 bg-[#131415] p-0 shadow-[0_0_150px_75px_rgba(92,92,249,0.15),0_0_75px_25px_rgba(123,123,255,0.1)] md:max-w-[520px]"
				portal
				unmountOnHide
			>
				<Ariakit.DialogDismiss className="absolute top-3 right-3 z-20 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white">
					<Icon name="x" className="h-6 w-6" />
				</Ariakit.DialogDismiss>

				{step === 'stripe' ? (
					<>
						<div className="border-b border-[#39393E] p-5 sm:p-6">
							<div className="flex items-center gap-3">
								<button
									onClick={() => {
										setStep('select')
										topupMutation.reset()
									}}
									className="rounded-lg p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E]/40 hover:text-white"
								>
									<Icon name="arrow-left" height={18} width={18} />
								</button>
								<div>
									<h2 className="text-lg font-bold text-white sm:text-xl">Complete Payment</h2>
									<p className="text-xs text-[#b4b7bc] sm:text-sm">
										Top up{' '}
										<span className="font-jetbrains font-semibold text-[#5C5CF9]">${parsedAmount.toFixed(2)}</span> to
										your LlamaAI Premium Data Balance
									</p>
								</div>
							</div>
						</div>
						{errorMessage ? (
							<div className="border-b border-[#39393E] bg-red-500/10 p-4">
								<div className="flex items-center gap-2 text-red-400">
									<Icon name="alert-triangle" height={18} width={18} />
									<p className="text-sm">{errorMessage}</p>
								</div>
							</div>
						) : stripeInstance ? (
							<div className="min-h-[400px] p-4">
								<EmbeddedCheckoutProvider stripe={stripeInstance} options={{ fetchClientSecret }}>
									<EmbeddedCheckout />
								</EmbeddedCheckoutProvider>
							</div>
						) : (
							<div className="py-12 text-center text-[#b4b7bc]">
								<p>Stripe is not configured.</p>
								<p className="mt-1 text-sm">Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment.</p>
							</div>
						)}
					</>
				) : (
					<div className="p-5 sm:p-6">
						{/* Header */}
						<div className="mb-6 flex items-center gap-3">
							<div className="rounded-lg bg-[#5C5CF9]/10 p-2.5 text-[#5C5CF9]">
								<Icon name="package" height={22} width={22} />
							</div>
							<div>
								<h2 className="text-lg font-bold text-white sm:text-xl">Top Up LlamaAI Premium Data Balance</h2>
								<p className="text-xs text-[#b4b7bc] sm:text-sm">Add credits to access premium data</p>
							</div>
						</div>

						{/* Amount input */}
						<div className="mb-4">
							<label className="mb-2 block text-sm font-medium text-[#b4b7bc]">Amount (USD)</label>
							<div className="relative">
								<span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-jetbrains text-xl text-[#8a8c90]">
									$
								</span>
								<input
									type="text"
									inputMode="decimal"
									value={amount}
									onChange={(e) => handleAmountInput(e.target.value)}
									placeholder="0.00"
									className="w-full rounded-lg border border-[#39393E] bg-[#1a1b1f] py-3.5 pr-4 pl-10 font-jetbrains text-xl text-white transition-colors outline-none placeholder:text-[#39393E] focus:border-[#5C5CF9]"
									autoFocus
								/>
							</div>
							{amount && !isValidAmount ? (
								<p className="mt-2 text-xs text-red-400">
									Enter an amount between ${TOPUP_CONFIG.minAmount} and ${TOPUP_CONFIG.maxAmount}
								</p>
							) : null}
						</div>

						{/* Quick select */}
						<div className="mb-6 flex gap-2">
							{TOPUP_CONFIG.quickAmounts.map((qa) => (
								<button
									key={qa}
									onClick={() => setAmount(String(qa))}
									className={`flex-1 rounded-lg border px-3 py-2 font-jetbrains text-sm font-medium transition-all ${
										amount === String(qa)
											? 'border-[#5C5CF9] bg-[#5C5CF9] text-white shadow-lg shadow-[#5C5CF9]/20'
											: 'border-[#39393E] bg-[#1a1b1f] text-[#8a8c90] hover:border-[#5C5CF9]/50 hover:text-white'
									}`}
								>
									${qa}
								</button>
							))}
						</div>

						{/* Payment methods */}
						<div className="mb-2">
							<label className="mb-3 block text-sm font-medium text-[#b4b7bc]">Payment Method</label>
							<div className="grid grid-cols-2 gap-3">
								<button
									onClick={handleStripe}
									disabled={!isValidAmount || topupMutation.isPending}
									className="group flex flex-col items-center gap-3 rounded-xl border border-[#39393E] bg-linear-to-b from-[#1a1b1f] to-[#161719] p-5 transition-all hover:border-[#5C5CF9]/60 hover:shadow-lg hover:shadow-[#5C5CF9]/10 disabled:cursor-not-allowed disabled:opacity-40"
								>
									<div className="rounded-lg bg-[#5C5CF9]/10 p-2.5 text-[#5C5CF9] transition-colors group-hover:bg-[#5C5CF9]/20">
										<Icon name="credit-card" height={22} width={22} />
									</div>
									<div className="text-center">
										<span className="block text-sm font-medium text-white">Pay with Card</span>
									</div>
								</button>
								<button
									onClick={() => {
										void handleLlamaPay()
									}}
									disabled={!isValidAmount || topupMutation.isPending || isRedirecting}
									className="group flex flex-col items-center gap-3 rounded-xl border border-[#39393E] bg-linear-to-b from-[#1a1b1f] to-[#161719] p-5 transition-all hover:border-[#5C5CF9]/60 hover:shadow-lg hover:shadow-[#5C5CF9]/10 disabled:cursor-not-allowed disabled:opacity-40"
								>
									<div className="rounded-lg bg-[#5C5CF9]/10 p-2.5 text-[#5C5CF9] transition-colors group-hover:bg-[#5C5CF9]/20">
										{isRedirecting ? (
											<span className="block h-[22px] w-[22px] animate-spin rounded-full border-2 border-[#5C5CF9]/30 border-t-[#5C5CF9]" />
										) : (
											<Icon name="wallet" height={22} width={22} />
										)}
									</div>
									<div className="text-center">
										<span className="block text-sm font-medium text-white">
											{isRedirecting ? 'Redirecting...' : 'Pay with Crypto'}
										</span>
									</div>
								</button>
							</div>
						</div>

						{errorMessage ? (
							<div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-red-400">
								<Icon name="alert-triangle" height={16} width={16} />
								<p className="text-sm">{errorMessage}</p>
							</div>
						) : null}
					</div>
				)}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
