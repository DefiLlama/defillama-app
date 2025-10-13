import { Dialog, DialogDismiss, DialogHeading } from '@ariakit/react'
import { Icon } from '~/components/Icon'

export function PortfolioDialog({ open, setOpen, addPortfolio }) {
	return (
		<Dialog
			open={open}
			onClose={() => setOpen(false)}
			modal={true}
			className="fixed top-[50%] left-[50%] flex h-fit w-8/10 max-w-150 translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 sm:w-1/2 lg:w-1/3"
		>
			<div className="flex items-center justify-between gap-2">
				<DialogHeading className="text-lg font-medium">New portfolio</DialogHeading>
				<DialogDismiss
					className="-my-2 ml-auto rounded-lg p-2 text-(--text-tertiary) hover:bg-(--divider) hover:text-(--text-primary)"
					onClick={() => setOpen(false)}
					aria-label="Close"
				>
					<Icon name="x" height={20} width={20} />
					<span className="sr-only">Close dialog</span>
				</DialogDismiss>
			</div>
			<form
				onSubmit={(e) => {
					e.preventDefault()
					const formData = new FormData(e.target as HTMLFormElement)
					const name = formData.get('name') as string
					addPortfolio(name)
					setOpen(false)
				}}
			>
				<label className="flex flex-col gap-1">
					<span className="text-sm text-(--text-secondary)">Enter the name of your new portfolio</span>
					<input
						required
						className="rounded-md border border-(--form-control-border) bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white"
						name="name"
					/>
				</label>
			</form>
			<button className="mt-3 rounded-md bg-(--link-active-bg) p-3 text-white disabled:opacity-50">Save</button>
		</Dialog>
	)
}
