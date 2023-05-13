import { useDialogState, Dialog } from 'ariakit/dialog'
import { useState } from 'react'
import { Flag as FlagIcon } from 'react-feather'
import { mutate } from 'swr'
import { FormSubmitBtn } from '~/components'
import { DialogForm } from '~/components/Filters/common/Base'

export function Flag({ protocol, dataType }) {
	const [loading, setLoading] = useState(false)
	const dialog = useDialogState()

	// fetch('https://api.llama.fi/reportError', options).then((response) => response.json())

	const onSubmit = (e) => {
		e.preventDefault()
		setLoading(true)
		const form = e.target as HTMLFormElement

		mutate('https://api.llama.fi/reportError', async () => {
			const data = await fetch('https://api.llama.fi/reportError', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					protocol,
					dataType,
					message: form.message?.value ?? '',
					correctSource: form.correctSource?.value ?? ''
				})
			}).finally(() => {
				setLoading(false)
				dialog.setOpen(false)
			})
			return data
		})
	}

	return (
		<>
			<button onClick={dialog.toggle}>
				<FlagIcon size={14} />
			</button>

			<Dialog state={dialog} className="dialog">
				<DialogForm onSubmit={onSubmit} data-variant="secondary">
					<label>
						<span>Protocol</span>
						<input name="protocol" value={protocol} disabled />
					</label>
					<label>
						<span>Data Type</span>
						<input name="data type" value={dataType} disabled />
					</label>
					<label>
						<span>What's wrong about it? (optional)</span>
						<textarea name="message" />
					</label>
					<label>
						<span>Where can we find correct information? (optional)</span>
						<textarea name="correctSource" />
					</label>
					<FormSubmitBtn name="submit-btn" disabled={loading}>
						Report
					</FormSubmitBtn>
				</DialogForm>
			</Dialog>
		</>
	)
}
