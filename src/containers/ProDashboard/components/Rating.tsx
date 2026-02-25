import { useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import type { FormSubmitEvent } from '~/types/forms'

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
	const [isSubmitting, setIsSubmitting] = useState(false)
	const bannerFeedbackId = `${sessionId}-rating-feedback-banner`
	const inlineFeedbackId = `${sessionId}-rating-feedback-inline`

	const handleStarClick = (star: number) => {
		setRating(star)
	}

	const handleSubmit = async (e: FormSubmitEvent) => {
		e.preventDefault()
		if (rating === 0) return

		if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
			toast.error('Rating must be between 1 and 5')
			return
		}

		setIsSubmitting(true)
		const feedbackInput = e.currentTarget.elements.namedItem('feedback') as HTMLTextAreaElement | null
		const feedbackValue = feedbackInput?.value.trim() || undefined
		try {
			await onRate(sessionId, rating, feedbackValue)
		} catch (error) {
			console.error('Failed to submit rating:', error)
		}
		setIsSubmitting(false)
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
			<form
				onSubmit={handleSubmit}
				className="relative isolate col-span-full flex animate-ai-glow flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4"
			>
				<div className="flex items-center gap-4">
					<h3 className="text-lg font-semibold">{currentTexts.title}</h3>
					<div className="flex items-center gap-1">
						{[1, 2, 3, 4, 5].map((star) => (
							<button
								key={star}
								type="button"
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
										star <= (hoveredRating || rating) ? 'fill-current text-yellow-400' : 'text-(--text-form)'
									} transition-colors`}
								/>
							</button>
						))}
					</div>
					{onDismiss && (
						<button
							type="button"
							onClick={() => onDismiss(sessionId)}
							className="ml-auto rounded-md p-2 hover:bg-red-500/10 hover:text-(--error)"
							disabled={isSubmitting}
							title="Dismiss"
						>
							<Icon name="x" height={16} width={16} />
						</button>
					)}
				</div>

				<p className="text-sm text-(--text-label)">{currentTexts.subtitle}</p>

				{prompt && (
					<div className="flex flex-col items-center gap-2 rounded-md border border-(--cards-border) bg-(--app-bg) p-3">
						<p className="text-xs text-(--text-label)">Prompt used:</p>
						<p className="text-center text-sm">{prompt}</p>
					</div>
				)}

				{rating > 0 && (
					<div className="flex w-full flex-col gap-1">
						<label
							htmlFor={bannerFeedbackId}
							className="text-xs font-semibold tracking-wide text-(--text-label) uppercase"
						>
							Your Feedback (Optional)
						</label>
						<textarea
							id={bannerFeedbackId}
							name="feedback"
							placeholder="Share your thoughts about the AI-generated dashboard..."
							rows={3}
							className="w-full rounded-md border border-(--form-control-border) bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white"
							disabled={isSubmitting}
						/>
					</div>
				)}

				<div className="mt-6 flex items-center justify-center gap-3">
					<button
						type="button"
						onClick={handleSkip}
						disabled={isSubmitting}
						className="px-4 py-2 text-sm hover:text-(--link-text)"
					>
						Skip
					</button>

					{rating > 0 && (
						<button
							type="submit"
							disabled={isSubmitting}
							className={`flex items-center gap-2 rounded-md bg-(--old-blue) px-6 py-2 font-medium text-white`}
						>
							{isSubmitting ? <LoadingSpinner size={16} /> : <Icon name="sparkles" height={16} width={16} />}
							Submit Rating
						</button>
					)}
				</div>
			</form>
		)
	}

	return (
		<form onSubmit={handleSubmit} className="contents">
			<Icon name="sparkles" height={24} width={24} className="shrink-0 text-pro-blue-400 dark:text-pro-blue-200" />

			<h3 className="-mt-5 text-xl font-semibold">{currentTexts.title}</h3>
			<p className="-mt-5 text-sm text-(--text-label)">{currentTexts.subtitle}</p>

			{prompt && (
				<div className="flex w-full max-w-xl flex-col items-center gap-2 rounded-md border border-(--cards-border) bg-(--app-bg) p-3">
					<h4 className="text-xs text-(--text-label)">Prompt used:</h4>
					<p className="text-center text-sm">{prompt}</p>
				</div>
			)}

			<div className="flex items-center justify-center gap-2">
				{[1, 2, 3, 4, 5].map((star) => (
					<button
						key={star}
						type="button"
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
								star <= (hoveredRating || rating) ? 'fill-current text-yellow-400' : 'text-(--text-form)'
							} transition-colors`}
						/>
					</button>
				))}
			</div>

			{rating > 0 ? (
				<div className="flex w-full max-w-xl flex-col items-center gap-6">
					<div className="flex w-full flex-col items-center gap-1">
						<label
							htmlFor={inlineFeedbackId}
							className="text-center text-xs font-semibold tracking-wide text-(--text-label) uppercase"
						>
							Your Feedback (Optional)
						</label>
						<textarea
							id={inlineFeedbackId}
							name="feedback"
							placeholder="Share your thoughts about the AI-generated dashboard..."
							rows={3}
							className="w-full rounded-md border border-(--form-control-border) bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white"
							disabled={isSubmitting}
						/>
					</div>

					<div className="flex items-center justify-center gap-3">
						<button
							type="button"
							onClick={handleSkip}
							disabled={isSubmitting}
							className="px-4 py-2 text-sm text-(--text-form) hover:text-(--link-text)"
						>
							Skip
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className={`flex items-center gap-2 rounded-md bg-(--old-blue) px-6 py-2 font-medium text-white`}
						>
							{isSubmitting ? <LoadingSpinner size={16} /> : <Icon name="sparkles" height={16} width={16} />}
							Submit Rating
						</button>
					</div>
				</div>
			) : (
				<>
					<p className="-mt-5 text-center text-xs text-(--text-form)">Click the stars above to rate your experience</p>

					<button
						type="button"
						onClick={handleSkip}
						disabled={isSubmitting}
						className="px-4 py-2 text-sm hover:text-(--link-text)"
					>
						Skip
					</button>
				</>
			)}
		</form>
	)
}
