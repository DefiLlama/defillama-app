import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
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
			<div className="mx-auto flex w-full max-w-lg flex-col gap-4 lg:mt-4 xl:mt-11">
				<form
					onSubmit={onSubmit}
					className="flex w-full flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3"
				>
					<h1 className="mb-3 text-center text-xl font-semibold">Report Error</h1>
					<label className="flex flex-col gap-1">
						<span>Chain / Protocol</span>
						<input
							name="protocol"
							required
							className="rounded-md border border-(--form-control-border) bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white"
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span>What's wrong about it?</span>
						<textarea
							name="message"
							required
							className="rounded-md border border-(--form-control-border) bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white"
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span>Where can we find correct information? (optional)</span>
						<textarea
							name="correctSource"
							className="rounded-md border border-(--form-control-border) bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white"
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span>How can we contact you? (optional)</span>
						<input
							name="contact"
							placeholder="Email address"
							className="rounded-md border border-(--form-control-border) bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white"
						/>
					</label>
					<button
						name="submit-btn"
						disabled={isPending}
						className="mt-3 rounded-md bg-[#2172e5] p-3 text-white hover:bg-[#4190ff] focus-visible:bg-[#4190ff] disabled:opacity-50"
					>
						{isPending ? 'Submitting...' : 'Report'}
					</button>
					{error && <small className="text-center text-red-500">{error.message}</small>}
				</form>
				<div className="flex w-full flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<p className="text-center text-base font-medium">
						Please submit a report if you notice any of the following:
					</p>
					<ul className="flex list-disc flex-col gap-1 pl-4">
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
