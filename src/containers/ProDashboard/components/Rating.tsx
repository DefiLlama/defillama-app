import { useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'

interface RatingProps {
	sessionId: string
	mode: 'create' | 'iterate'
	variant: 'banner' | 'inline'
	prompt?: string
	onRate: (sessionId: string, rating: number, feedback?: string) => void
	onSkip: (sessionId: string) => void
	onDismiss?: (sessionId: string) => void
}

export function Rating({ sessionId, mode, variant, prompt, onRate, onSkip, onDismiss }: RatingProps) {
	const [rating, setRating] = useState(0)
	const [hoveredRating, setHoveredRating] = useState(0)
	const [feedback, setFeedback] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleStarClick = (star: number) => {
		setRating(star)
	}

	const handleSubmit = async () => {
		if (rating === 0) return

		if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
			toast.error('Rating must be between 1 and 5')
			return
		}

		setIsSubmitting(true)
		try {
			await onRate(sessionId, rating, feedback.trim() || undefined)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleSkip = async () => {
		onSkip(sessionId)
	}

	const texts = {
		banner: {
			title: mode === 'create' ? 'Rate this AI-generated dashboard' : 'Rate this AI improvement',
			subtitle:
				mode === 'create'
					? 'How well did LlamaAI understand your requirements?'
					: 'How well did LlamaAI improve your dashboard?'
		},
		inline: {
			title: mode === 'create' ? 'Rate AI Generation' : 'Rate AI Improvement',
			subtitle: mode === 'create' ? 'Help us improve dashboard generation' : 'Help us improve dashboard iterations'
		}
	}

	const currentTexts = texts[variant]

	if (variant === 'banner') {
		return (
			<div className="pro-bg1 pro-border animate-ai-glow mb-4 border p-4">
				<div className="flex items-start justify-between gap-4">
					<div className="flex flex-1 items-center gap-3">
						<div className="flex-shrink-0">
							<Icon name="sparkles" height={20} width={20} className="text-(--primary)" />
						</div>

						<div className="flex-1">
							<div className="mb-2 flex items-center gap-4">
								<h3 className="pro-text1 text-lg font-semibold">{currentTexts.title}</h3>
								<div className="flex items-center gap-1">
									{[1, 2, 3, 4, 5].map((star) => (
										<button
											key={star}
											onClick={() => handleStarClick(star)}
											onMouseEnter={() => setHoveredRating(star)}
											onMouseLeave={() => setHoveredRating(0)}
											className="p-1 transition-transform hover:scale-110"
											disabled={isSubmitting}
										>
											<Icon
												name="star"
												height={20}
												width={20}
												className={`${
													star <= (hoveredRating || rating)
														? 'fill-current text-yellow-400'
														: 'text-gray-300 dark:text-gray-600'
												} transition-colors`}
											/>
										</button>
									))}
								</div>
							</div>

							<p className="pro-text3 mb-3 text-sm">{currentTexts.subtitle}</p>

							{prompt && (
								<div className="bg-opacity-30 pro-border mb-3 border bg-(--bg-glass) p-2">
									<div className="pro-text3 mb-1 text-xs">Prompt used:</div>
									<div className="pro-text2 text-sm">{prompt}</div>
								</div>
							)}

							{rating > 0 && (
								<div className="space-y-3">
									<label className="pro-text2 block text-xs font-semibold tracking-wide uppercase">
										Your Feedback (Optional)
									</label>
									<textarea
										value={feedback}
										onChange={(e) => setFeedback(e.target.value)}
										placeholder="Share your thoughts about the AI-generated dashboard..."
										rows={3}
										className="pro-border pro-text1 placeholder:pro-text3 w-full resize-none rounded-md border-2 bg-(--bg-main) px-3 py-2 text-sm focus:border-(--primary) focus:outline-hidden"
										disabled={isSubmitting}
									/>
								</div>
							)}

							<div className="mt-6 flex items-center justify-center gap-3">
								<button
									onClick={handleSkip}
									disabled={isSubmitting}
									className="pro-text3 hover:pro-text2 px-3 py-2 text-sm transition-colors"
								>
									Skip
								</button>

								{rating > 0 && (
									<button
										onClick={handleSubmit}
										disabled={isSubmitting}
										className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
											isSubmitting
												? 'pro-text3 cursor-not-allowed bg-(--bg-tertiary)'
												: 'bg-(--primary) text-white hover:bg-(--primary-hover)'
										}`}
									>
										{isSubmitting ? (
											<>
												<Icon name="sparkles" height={14} width={14} className="animate-spin" />
												Submitting...
											</>
										) : (
											<>
												<Icon name="check" height={14} width={14} />
												Submit Rating
											</>
										)}
									</button>
								)}
							</div>
						</div>
					</div>

					{onDismiss && (
						<button
							onClick={() => onDismiss(sessionId)}
							className="pro-text3 hover:pro-text1 flex-shrink-0 p-2 transition-colors hover:bg-(--bg-main)"
							disabled={isSubmitting}
							title="Dismiss"
						>
							<Icon name="x" height={16} width={16} />
						</button>
					)}
				</div>
			</div>
		)
	}

	return (
		<div className="pro-bg1 pro-border animate-ai-glow border p-4">
			<div className="mx-auto max-w-lg text-center">
				<div className="mb-4 flex justify-center">
					<Icon name="sparkles" height={24} width={24} className="text-(--primary)" />
				</div>

				<h3 className="pro-text1 mb-2 text-xl font-semibold">{currentTexts.title}</h3>
				<p className="pro-text3 mb-6 text-sm">{currentTexts.subtitle}</p>

				{prompt && (
					<div className="bg-opacity-30 pro-border mx-auto mb-6 max-w-md border bg-(--bg-glass) p-3">
						<div className="pro-text3 mb-2 text-center text-xs">Prompt used:</div>
						<div className="pro-text2 text-center text-sm">{prompt}</div>
					</div>
				)}

				<div className="mb-6 flex items-center justify-center gap-2">
					{[1, 2, 3, 4, 5].map((star) => (
						<button
							key={star}
							onClick={() => handleStarClick(star)}
							onMouseEnter={() => setHoveredRating(star)}
							onMouseLeave={() => setHoveredRating(0)}
							className="p-2 transition-transform hover:scale-110"
							disabled={isSubmitting}
						>
							<Icon
								name="star"
								height={24}
								width={24}
								className={`${
									star <= (hoveredRating || rating)
										? 'fill-current text-yellow-400'
										: 'text-gray-300 dark:text-gray-600'
								} transition-colors`}
							/>
						</button>
					))}
				</div>

				{rating > 0 && (
					<div className="space-y-4">
						<div className="mx-auto max-w-sm space-y-2">
							<label className="pro-text2 block text-center text-xs font-semibold tracking-wide uppercase">
								Your Feedback (Optional)
							</label>
							<textarea
								value={feedback}
								onChange={(e) => setFeedback(e.target.value)}
								placeholder="Share your thoughts about the AI-generated dashboard..."
								rows={3}
								className="pro-border pro-text1 placeholder:pro-text3 w-full resize-none rounded-md border-2 bg-(--bg-main) px-3 py-2 text-sm focus:border-(--primary) focus:outline-hidden"
								disabled={isSubmitting}
							/>
						</div>

						<div className="flex justify-center gap-3">
							<button
								onClick={handleSkip}
								disabled={isSubmitting}
								className="pro-text3 hover:pro-text2 px-4 py-2 text-sm transition-colors"
							>
								Skip
							</button>
							<button
								onClick={handleSubmit}
								disabled={isSubmitting}
								className={`flex items-center gap-2 px-6 py-2 font-medium transition-colors ${
									isSubmitting
										? 'pro-text3 cursor-not-allowed bg-(--bg-tertiary)'
										: 'bg-(--primary) text-white hover:bg-(--primary-hover)'
								}`}
							>
								{isSubmitting ? (
									<>
										<Icon name="sparkles" height={16} width={16} className="animate-spin" />
										Submitting...
									</>
								) : (
									<>
										<Icon name="sparkles" height={16} width={16} />
										Submit Rating
									</>
								)}
							</button>
						</div>
					</div>
				)}

				{rating === 0 && (
					<div className="mt-4 space-y-3">
						<p className="pro-text3 text-center text-xs">Click the stars above to rate your experience</p>
						<div className="flex justify-center">
							<button
								onClick={handleSkip}
								disabled={isSubmitting}
								className="pro-text3 hover:pro-text2 px-4 py-2 text-sm transition-colors"
							>
								Skip
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
