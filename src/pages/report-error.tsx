import { useMutation } from '@tanstack/react-query'
import * as React from 'react'
import toast from 'react-hot-toast'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'

async function reportError(report: any) {
	try {
		const data = await fetchJson('https://api.llama.fi/reportError', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(report)
		})
		return data
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to report')
	}
}

function ReportError() {
	const { mutateAsync, isPending, error } = useMutation({ mutationFn: reportError })
	const onSubmit = async (e) => {
		e.preventDefault()

		const form = e.target as HTMLFormElement

		mutateAsync({
			protocol: form.protocol?.value ?? '',
			dataType: form.dataType?.value ?? '',
			message: form.message?.value ?? '',
			correctSource: form.correctSource?.value ?? '',
			contact: form.contact?.value ?? ''
		}).then((data) => {
			if (data?.message === 'success') {
				toast.success('Report submitted successfully', { position: 'bottom-right' })
				form.reset()
			} else {
				console.log(data)
				toast.error('Failed to report', { position: 'bottom-right' })
			}
		})
	}

	return (
		<Layout title="Report Error - DefiLlama" defaultSEO>
			<div className="flex flex-col gap-4 w-full max-w-lg mx-auto lg:mt-4 xl:mt-11">
				<form
					onSubmit={onSubmit}
					className="flex flex-col gap-4 p-3 w-full bg-(--cards-bg) border border-(--cards-border) rounded-md"
				>
					<h1 className="text-xl font-semibold text-center mb-3">Report Error</h1>
					<label className="flex flex-col gap-1">
						<span>Chain / Protocol</span>
						<input
							name="protocol"
							required
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span>What's wrong about it?</span>
						<textarea
							name="message"
							required
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span>Where can we find correct information? (optional)</span>
						<textarea
							name="correctSource"
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span>How can we contact you? (optional)</span>
						<input
							name="contact"
							placeholder="Email address"
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
						/>
					</label>
					<button
						name="submit-btn"
						disabled={isPending}
						className="p-3 mt-3 bg-[#2172e5] text-white rounded-md hover:bg-[#4190ff] focus-visible:bg-[#4190ff] disabled:opacity-50"
					>
						{isPending ? 'Submitting...' : 'Report'}
					</button>
					{error && <small className="text-center text-red-500">{error.message}</small>}
				</form>
				<div className="flex flex-col gap-4 w-full bg-(--cards-bg) border border-(--cards-border) rounded-md">
					<p className="text-center text-base font-medium">
						Please submit a report if you notice any of the following:
					</p>
					<ul className="flex flex-col gap-1 list-disc pl-4">
						<li>
							Inconsistencies in our methodology (eg in protocol A we apply a different methodology for their metrics
							than in protocol B)
						</li>
						<li>Data errors (eg protocol A is missing fees for their new version, or the data just seems wrong)</li>
						<li>Missing data</li>
						<li>Bug on site</li>
					</ul>
					<p className="text-center">
						All submissions are completely anonymous and will be reviewed by a human manually
					</p>
				</div>
			</div>
		</Layout>
	)
}

export default ReportError
