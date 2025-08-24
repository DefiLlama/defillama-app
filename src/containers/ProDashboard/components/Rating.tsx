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
			subtitle: mode === 'create' ? 'How well did LlamaAI understand your requirements?' : 'How well did LlamaAI improve your dashboard?'
		},
		inline: {
			title: mode === 'create' ? 'Rate AI Generation' : 'Rate AI Improvement',
			subtitle: mode === 'create' ? 'Help us improve dashboard generation' : 'Help us improve dashboard iterations'
		}
	}

	const currentTexts = texts[variant]

	if (variant === 'banner') {
		return (
			<div className="pro-bg1 border pro-border p-4 mb-4 animate-ai-glow">
				<div className="flex items-start justify-between gap-4">
					<div className="flex items-center gap-3 flex-1">
						<div className="flex-shrink-0">
							<Icon name="sparkles" height={20} width={20} className="text-(--primary)" />
						</div>
						
						<div className="flex-1">
							<div className="flex items-center gap-4 mb-2">
								<h3 className="text-lg font-semibold pro-text1">{currentTexts.title}</h3>
								<div className="flex items-center gap-1">
									{[1, 2, 3, 4, 5].map((star) => (
										<button
											key={star}
											onClick={() => handleStarClick(star)}
											onMouseEnter={() => setHoveredRating(star)}
											onMouseLeave={() => setHoveredRating(0)}
											className="p-1 hover:scale-110 transition-transform"
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
							
							<p className="text-sm pro-text3 mb-3">{currentTexts.subtitle}</p>

							{prompt && (
								<div className="mb-3 p-2 bg-(--bg-glass) bg-opacity-30 border pro-border">
									<div className="text-xs pro-text3 mb-1">Prompt used:</div>
									<div className="text-sm pro-text2">{prompt}</div>
								</div>
							)}

							{rating > 0 && (
								<div className="space-y-3">
									<label className="text-xs font-semibold pro-text2 uppercase tracking-wide block">Your Feedback (Optional)</label>
									<textarea
										value={feedback}
										onChange={(e) => setFeedback(e.target.value)}
										placeholder="Share your thoughts about the AI-generated dashboard..."
										rows={3}
										className="w-full px-3 py-2 bg-(--bg-main) border-2 pro-border pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary) resize-none text-sm rounded-md"
										disabled={isSubmitting}
									/>
								</div>
							)}

							<div className="flex items-center justify-center gap-3 mt-6">
								<button
									onClick={handleSkip}
									disabled={isSubmitting}
									className="px-3 py-2 text-sm pro-text3 hover:pro-text2 transition-colors"
								>
									Skip
								</button>
								
								{rating > 0 && (
									<button
										onClick={handleSubmit}
										disabled={isSubmitting}
										className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
											isSubmitting
												? 'bg-(--bg-tertiary) pro-text3 cursor-not-allowed'
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
							className="flex-shrink-0 p-2 pro-text3 hover:pro-text1 hover:bg-(--bg-main) transition-colors"
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
		<div className="pro-bg1 border pro-border p-4 animate-ai-glow">
			<div className="max-w-lg mx-auto text-center">
				<div className="flex justify-center mb-4">
					<Icon name="sparkles" height={24} width={24} className="text-(--primary)" />
				</div>
				
				<h3 className="text-xl font-semibold pro-text1 mb-2">{currentTexts.title}</h3>
				<p className="text-sm pro-text3 mb-6">{currentTexts.subtitle}</p>

				{prompt && (
					<div className="mb-6 p-3 bg-(--bg-glass) bg-opacity-30 border pro-border max-w-md mx-auto">
						<div className="text-xs pro-text3 mb-2 text-center">Prompt used:</div>
						<div className="text-sm pro-text2 text-center">{prompt}</div>
					</div>
				)}

				<div className="flex justify-center items-center gap-2 mb-6">
					{[1, 2, 3, 4, 5].map((star) => (
						<button
							key={star}
							onClick={() => handleStarClick(star)}
							onMouseEnter={() => setHoveredRating(star)}
							onMouseLeave={() => setHoveredRating(0)}
							className="p-2 hover:scale-110 transition-transform"
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
						<div className="max-w-sm mx-auto space-y-2">
							<label className="text-xs font-semibold pro-text2 uppercase tracking-wide block text-center">Your Feedback (Optional)</label>
							<textarea
								value={feedback}
								onChange={(e) => setFeedback(e.target.value)}
								placeholder="Share your thoughts about the AI-generated dashboard..."
								rows={3}
								className="w-full px-3 py-2 bg-(--bg-main) border-2 pro-border pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary) resize-none text-sm rounded-md"
								disabled={isSubmitting}
							/>
						</div>

						<div className="flex justify-center gap-3">
							<button
								onClick={handleSkip}
								disabled={isSubmitting}
								className="px-4 py-2 text-sm pro-text3 hover:pro-text2 transition-colors"
							>
								Skip
							</button>
							<button
								onClick={handleSubmit}
								disabled={isSubmitting}
								className={`px-6 py-2 font-medium transition-colors flex items-center gap-2 ${
									isSubmitting
										? 'bg-(--bg-tertiary) pro-text3 cursor-not-allowed'
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
					<div className="space-y-3 mt-4">
						<p className="text-xs pro-text3 text-center">
							Click the stars above to rate your experience
						</p>
						<div className="flex justify-center">
							<button
								onClick={handleSkip}
								disabled={isSubmitting}
								className="px-4 py-2 text-sm pro-text3 hover:pro-text2 transition-colors"
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