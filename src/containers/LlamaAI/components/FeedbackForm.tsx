import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { handleSimpleFetchResponse } from '~/utils/async'

interface FeedbackFormProps {
	messageId?: string
	selectedRating: 'good' | 'bad' | null
	setSelectedRating: (rating: 'good' | 'bad' | null) => void
	setShowFeedback: (show: boolean) => void
	onRatingSubmitted: (rating: 'good' | 'bad' | null) => void
}

export function FeedbackForm({
	messageId,
	selectedRating,
	setSelectedRating,
	setShowFeedback,
	onRatingSubmitted
}: FeedbackFormProps) {
	const { authorizedFetch } = useAuthContext()
	const { mutate: submitFeedback, isPending: isSubmittingFeedback } = useMutation({
		mutationFn: async ({ rating, feedback }: { rating: 'good' | 'bad' | null; feedback?: string }) => {
			const res = await authorizedFetch(`${MCP_SERVER}/user/messages/${messageId}/rate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rating, feedback })
			})
				.then(handleSimpleFetchResponse)
				.then((res: Response) => res.json())

			return res
		},
		onSuccess: (_, variables) => {
			onRatingSubmitted(variables.rating)
			setShowFeedback(false)
			toast.success('Thank you for your feedback!')
		},
		onError: (error) => {
			console.error('Failed to submit feedback:', error)
			toast.error(error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.')
		}
	})

	const [feedbackText, setFeedbackText] = useState('')
	const finalFeedbackText = useDeferredValue(feedbackText)

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				const form = e.target as HTMLFormElement
				submitFeedback({ rating: selectedRating, feedback: form.feedback?.value?.trim() })
			}}
			className="flex flex-col gap-4"
		>
			<div className="flex flex-col gap-2">
				<span className="text-sm font-medium">Rate this response</span>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setSelectedRating('good')}
						disabled={isSubmittingFeedback}
						className={`flex flex-1 items-center justify-center gap-2 rounded border p-3 transition-colors ${
							selectedRating === 'good'
								? 'border-(--success) bg-(--success)/12 text-(--success)'
								: 'border-[#e6e6e6] text-[#666] hover:border-(--success) hover:bg-(--success)/5 dark:border-[#222324] dark:text-[#919296]'
						}`}
					>
						<Icon name="thumbs-up" height={16} width={16} />
						<span className="text-sm font-medium">Good</span>
					</button>
					<button
						type="button"
						onClick={() => setSelectedRating('bad')}
						disabled={isSubmittingFeedback}
						className={`flex flex-1 items-center justify-center gap-2 rounded border p-3 transition-colors ${
							selectedRating === 'bad'
								? 'border-(--error) bg-(--error)/12 text-(--error)'
								: 'border-[#e6e6e6] text-[#666] hover:border-(--error) hover:bg-(--error)/5 dark:border-[#222324] dark:text-[#919296]'
						}`}
					>
						<Icon name="thumbs-down" height={16} width={16} />
						<span className="text-sm font-medium">Bad</span>
					</button>
				</div>
			</div>
			<label className="flex flex-col gap-2">
				<span className="text-sm text-[#666] dark:text-[#919296]">Additional feedback (optional)</span>
				<textarea
					name="feedback"
					placeholder="Share your thoughts..."
					className="w-full rounded border border-[#e6e6e6] bg-(--app-bg) p-3 dark:border-[#222324]"
					rows={3}
					maxLength={500}
					disabled={isSubmittingFeedback}
					onChange={(e) => setFeedbackText(e.target.value)}
				/>
			</label>
			<div className="flex items-center justify-between">
				<span className="text-xs text-[#666] dark:text-[#919296]">{finalFeedbackText.length}/500</span>
				<div className="flex gap-3">
					<Ariakit.DialogDismiss
						disabled={isSubmittingFeedback}
						className="rounded px-3 py-2 text-xs text-[#666] hover:bg-[#e6e6e6] disabled:opacity-50 dark:text-[#919296] dark:hover:bg-[#222324]"
					>
						Cancel
					</Ariakit.DialogDismiss>
					<button
						type="submit"
						disabled={isSubmittingFeedback || !selectedRating}
						className="rounded bg-(--old-blue) px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
					>
						{isSubmittingFeedback ? 'Submitting...' : 'Submit'}
					</button>
				</div>
			</div>
		</form>
	)
}
