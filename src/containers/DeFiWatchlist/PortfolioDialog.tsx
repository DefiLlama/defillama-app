import { useState } from 'react'
import { Combobox, ComboboxProvider, Dialog, DialogDescription, DialogHeading } from '@ariakit/react'

export function PortfolioDialog({ open, setOpen, addPortfolio }) {
	const [newPortfolio, setNewPortfolio] = useState('')
	return (
		<Dialog
			open={open}
			onClose={() => setOpen(false)}
			modal={true}
			className="fixed top-[50%] left-[50%] flex h-fit w-8/10 max-w-150 translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 sm:w-1/2 lg:w-1/3"
		>
			<div className="flex flex-col gap-2">
				<button
					className="absolute top-4 right-4 p-1 text-sm text-(--text-secondary) transition-colors hover:text-(--text-primary)"
					onClick={() => setOpen(false)}
					aria-label="Close"
				>
					x
				</button>
				<DialogHeading className="text-lg font-medium">New portfolio</DialogHeading>
				<DialogDescription className="text-sm text-(--text-secondary)">
					Enter the name of your new portfolio
				</DialogDescription>
			</div>
			<ComboboxProvider defaultValue="" value={newPortfolio} resetValueOnHide open={open} setValue={setNewPortfolio}>
				<Combobox
					required
					type="text"
					className="rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1.25 text-sm text-black dark:text-white"
				/>
			</ComboboxProvider>
			<button
				onClick={() => {
					if (newPortfolio) {
						addPortfolio(newPortfolio)
						setOpen(false)
					}
				}}
				className="ml-auto w-fit rounded-md bg-(--btn-bg) px-6 py-2 hover:bg-(--btn-hover-bg)"
			>
				Save
			</button>
		</Dialog>
	)
}
