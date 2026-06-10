import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

interface SubmitButtonProps {
	isStreaming?: boolean
	isPending: boolean
	hasValue: boolean
	onStop?: () => void
}

export function SubmitButton({ isStreaming, isPending, hasValue, onStop }: SubmitButtonProps) {
	if (isStreaming && hasValue) {
		return (
			<Tooltip
				content="Queue message"
				render={<button type="submit" data-umami-event="llamaai-prompt-queue" />}
				className="flex size-7 items-center justify-center gap-2 rounded-lg bg-(--old-blue) text-white hover:bg-(--old-blue)/80 focus-visible:bg-(--old-blue)/80"
			>
				<Icon name="arrow-up" height={14} width={14} className="sm:size-4" />
				<span className="sr-only">Queue message</span>
			</Tooltip>
		)
	}

	if (isStreaming) {
		return (
			<Tooltip
				content="Stop"
				render={<button type="button" onClick={onStop} data-umami-event="llamaai-stop-generation" />}
				className="group flex size-7 items-center justify-center rounded-lg bg-(--old-blue)/12 hover:bg-(--old-blue)"
			>
				<span className="block size-2 bg-(--old-blue) group-hover:bg-white group-focus-visible:bg-white sm:size-2.5" />
				<span className="sr-only">Stop</span>
			</Tooltip>
		)
	}

	return (
		<button
			type="submit"
			data-umami-event="llamaai-prompt-submit"
			className="flex size-7 items-center justify-center gap-2 rounded-lg bg-(--old-blue) text-white hover:bg-(--old-blue)/80 focus-visible:bg-(--old-blue)/80 disabled:opacity-25"
			disabled={isPending || isStreaming || !hasValue}
		>
			<Icon name="arrow-up" height={14} width={14} className="sm:size-4" />
			<span className="sr-only">Submit prompt</span>
		</button>
	)
}
