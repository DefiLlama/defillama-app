import { useMutation } from '@tanstack/react-query'
import * as React from 'react'
import toast from 'react-hot-toast'
import Layout from '~/layout'

async function submitSupportRequest(formData: FormData) {
	try {
		const data = await fetch(
			'https://webhook.frontapp.com/forms/0f7e04ca1380d461a597/F-gV64YL71ksNtFfBSteerjcsVT2UusHNyigTYyWlSg_j9Va6r7w3rk7sG7BqL0_RbBV4EFPAITxrs7uaTjThq7V5ZEJEoUfeYI1EWXvjbXD2HOhb3fm0OUHJJVOcOg',
			{
				method: 'POST',
				body: formData
			}
		).then((res) => res.json())
		return data
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to report')
	}
}

function Support() {
	const { mutateAsync, isPending, error } = useMutation({ mutationFn: submitSupportRequest })
	const onSubmit = async (e) => {
		e.preventDefault()

		const form = e.target as HTMLFormElement
		const formData = new FormData(form)

		// Remove the file field if no file is selected
		const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement
		if (fileInput && (!fileInput.files || fileInput.files.length === 0)) {
			formData.delete('attachment')
		}

		mutateAsync(formData)
			.then((data) => {
				if (data?.message === 'success') {
					toast.success('Support request submitted successfully', { position: 'bottom-right' })
					form.reset()
				} else {
					console.log(data)
					toast.error('Failed to submit support request', { position: 'bottom-right' })
				}
			})
			.catch((error) => {
				toast.error('Failed to submit support request', { position: 'bottom-right' })
			})
	}

	return (
		<Layout title="Support - DefiLlama" defaultSEO>
			<div className="flex flex-col gap-4 w-full max-w-lg mx-auto lg:mt-4 xl:mt-11">
				<form
					onSubmit={onSubmit}
					className="flex flex-col gap-4 p-3 w-full bg-(--cards-bg) border border-(--cards-border) rounded-md"
				>
					<h1 className="text-xl font-semibold text-center mb-3">Support</h1>
					<label className="flex flex-col gap-1">
						<span>Name</span>
						<input
							type="text"
							name="name"
							required
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
						/>
					</label>

					<label className="flex flex-col gap-1">
						<span>Email</span>
						<input
							type="email"
							name="email"
							required
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
						/>
					</label>

					<label className="flex flex-col gap-1">
						<span>Description</span>
						<textarea
							name="body"
							required
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
						></textarea>
					</label>

					<label className="flex flex-col gap-1">
						<span>Attachment (optional)</span>
						<input
							type="file"
							name="attachment"
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
						/>
					</label>

					<button
						name="submit-btn"
						disabled={isPending}
						className="p-3 mt-3 bg-[#2172e5] text-white rounded-md hover:bg-[#4190ff] focus-visible:bg-[#4190ff] disabled:opacity-50"
					>
						{isPending ? 'Submitting...' : 'Submit'}
					</button>
					{error && <small className="text-center text-red-500">{error.message}</small>}
				</form>
			</div>
		</Layout>
	)
}

export default Support
