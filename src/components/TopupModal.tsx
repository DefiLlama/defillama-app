import * as Ariakit from '@ariakit/react'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useCallback, useState } from 'react'
import { Icon } from '~/components/Icon'
import { STRIPE_PUBLISHABLE_KEY } from '~/constants'
import { useCreateTopup, TOPUP_CONFIG } from '~/containers/Subscription/useTopup'

const stripeInstance = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

interface TopupModalProps {
	isOpen: boolean
	onClose: () => void
}

export function TopupModal({ isOpen, onClose }: TopupModalProps) {
	const [amount, setAmount] = useState('10')
	const [step, setStep] = useState<'select' | 'stripe'>('select')
	const [isRedirecting, setIsRedirecting] = useState(false)
	const topupMutation = useCreateTopup()

	const parsedAmount = parseFloat(amount)
	const isValidAmount =
		Number.isFinite(parsedAmount) && parsedAmount >= TOPUP_CONFIG.minAmount && parsedAmount <= TOPUP_CONFIG.maxAmount

	const handleClose = useCallback(() => {
		setAmount('10')
		setStep('select')
		setIsRedirecting(false)
		topupMutation.reset()
		onClose()
	}, [onClose, topupMutation])

	const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/account'
	const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}${currentPath}?topup=success` : ''
	const cancelUrl = typeof window !== 'undefined' ? `${window.location.origin}${currentPath}` : ''

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

	const handleStripe = useCallback(() => {
		if (!isValidAmount) return
		setStep('stripe')
	}, [isValidAmount])

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
				backdrop={<div className="bg-black/80" />}
				className="dialog max-h-[90vh] min-h-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 md:max-w-[420px]"
				portal
				unmountOnHide
			>
				{step === 'stripe' ? (
					<>
						{/* Stripe step header */}
						<div className="flex items-center gap-3 border-b border-(--sub-border-slate-100) px-5 py-4">
							<button
								onClick={() => {
									setStep('select')
									topupMutation.reset()
								}}
								className="rounded-full p-1 text-(--sub-ink-primary) transition-colors"
							>
								<Icon name="arrow-left" height={18} width={18} />
							</button>
							<div className="flex-1">
								<h3 className="text-xl leading-7 font-semibold text-(--sub-ink-primary)">Complete Payment</h3>
								<p className="text-xs text-(--sub-text-muted)">
									Top up <span className="font-semibold text-(--sub-brand-primary)">${parsedAmount.toFixed(2)}</span> to
									your External Data Balance
								</p>
							</div>
							<Ariakit.DialogDismiss className="rounded-full p-1 text-(--sub-ink-primary) transition-colors">
								<Icon name="x" height={24} width={24} />
							</Ariakit.DialogDismiss>
						</div>

						{errorMessage ? (
							<div className="border-b border-(--sub-border-slate-100) bg-(--sub-orange-400)/10 p-4">
								<div className="flex items-center gap-2 text-(--error)">
									<Icon name="alert-warning" height={18} width={18} className="shrink-0" />
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
							<div className="py-12 text-center text-(--sub-text-muted)">
								<p>Stripe is not configured.</p>
								<p className="mt-1 text-sm">Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment.</p>
							</div>
						)}
					</>
				) : (
					<div className="flex flex-col gap-5 px-5 py-6">
						{/* Header */}
						<div className="flex items-center justify-between">
							<h3 className="text-xl leading-7 font-semibold text-(--sub-ink-primary) dark:text-white">
								Top Up Balance
							</h3>
							<Ariakit.DialogDismiss className="rounded-full p-1 text-(--sub-ink-primary) transition-colors dark:text-white">
								<Icon name="x" height={24} width={24} />
							</Ariakit.DialogDismiss>
						</div>

						<p className="text-xs leading-4 text-(--sub-text-muted)">Add credits for LlamaAI to access premium data</p>

						{/* Amount input */}
						<div className="flex flex-col gap-2">
							<label className="text-sm text-(--sub-ink-primary) dark:text-white">Amount (USD)</label>
							<div className="relative">
								<span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-(--sub-text-muted)">
									$
								</span>
								<input
									type="text"
									inputMode="decimal"
									value={amount}
									onChange={(e) => handleAmountInput(e.target.value)}
									placeholder="0.00"
									autoFocus
									className="h-10 w-full rounded-lg border border-(--sub-border-muted) bg-(--sub-surface-panel) pr-3 pl-7 text-sm text-(--sub-ink-primary) outline-none focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:bg-(--sub-ink-primary) dark:text-white dark:focus:border-(--sub-brand-primary)"
								/>
							</div>
							{amount && !isValidAmount && (
								<p className="text-xs text-(--error)">
									Enter an amount between ${TOPUP_CONFIG.minAmount} and ${TOPUP_CONFIG.maxAmount}
								</p>
							)}
						</div>

						{/* Quick select */}
						<div className="flex gap-2">
							{TOPUP_CONFIG.quickAmounts.map((qa) => (
								<button
									key={qa}
									onClick={() => setAmount(String(qa))}
									className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
										amount === String(qa)
											? 'border-(--sub-brand-primary) bg-(--sub-brand-primary) text-white'
											: 'border-(--sub-border-muted) text-(--sub-ink-primary) hover:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:text-white dark:hover:border-(--sub-brand-primary)'
									}`}
								>
									${qa}
								</button>
							))}
						</div>

						{/* Payment methods */}
						<div className="flex flex-col gap-3">
							<label className="text-sm text-(--sub-ink-primary) dark:text-white">Payment Method</label>
							<div className="grid grid-cols-2 gap-3">
								<button
									onClick={handleStripe}
									disabled={!isValidAmount || topupMutation.isPending}
									className="flex flex-col items-center gap-2 rounded-xl border border-(--sub-border-muted) p-4 transition-colors hover:border-(--sub-brand-primary) disabled:opacity-40 dark:border-(--sub-border-strong) dark:hover:border-(--sub-brand-primary)"
								>
									<Icon name="credit-card" height={22} width={22} className="text-(--sub-brand-primary)" />
									<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">Pay with Card</span>
								</button>
								<button
									onClick={() => void handleLlamaPay()}
									disabled={!isValidAmount || topupMutation.isPending || isRedirecting}
									className="flex flex-col items-center gap-2 rounded-xl border border-(--sub-border-muted) p-4 transition-colors hover:border-(--sub-brand-primary) disabled:opacity-40 dark:border-(--sub-border-strong) dark:hover:border-(--sub-brand-primary)"
								>
									{isRedirecting ? (
										<span className="block h-[22px] w-[22px] animate-spin rounded-full border-2 border-(--sub-brand-primary)/30 border-t-(--sub-brand-primary)" />
									) : (
										<Icon name="wallet" height={22} width={22} className="text-(--sub-brand-primary)" />
									)}
									<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">
										{isRedirecting ? 'Redirecting...' : 'Pay with Crypto'}
									</span>
								</button>
							</div>
						</div>

						{errorMessage && (
							<div className="flex items-center gap-2 rounded-lg bg-(--sub-orange-400)/10 p-3 text-(--error)">
								<Icon name="alert-warning" height={16} width={16} className="shrink-0" />
								<p className="text-sm">{errorMessage}</p>
							</div>
						)}
					</div>
				)}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
