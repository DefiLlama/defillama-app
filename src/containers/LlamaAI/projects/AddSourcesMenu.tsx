import * as Ariakit from '@ariakit/react'
import { useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { AddTextContentModal } from './AddTextContentModal'
import { GitHubConnectModal } from './GitHubConnectModal'
import { useImportZip, useUploadProjectFiles } from './hooks'

interface AddSourcesMenuProps {
	projectId: string
	trigger: React.ReactNode
	menuClassName?: string
	gutter?: number
}

export function AddSourcesMenu({ projectId, trigger, menuClassName, gutter = 6 }: AddSourcesMenuProps) {
	const upload = useUploadProjectFiles(projectId)
	const zipUpload = useImportZip(projectId)
	const addTextStore = Ariakit.useDialogStore()
	const githubStore = Ariakit.useDialogStore()
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleFiles = useCallback(
		async (fileList: File[]) => {
			if (fileList.length === 0) return
			const isZip = (f: File) => /\.zip$/i.test(f.name) || f.type === 'application/zip'
			const zips = fileList.filter(isZip)
			const others = fileList.filter((f) => !isZip(f))
			try {
				if (others.length > 0) {
					const res = await upload.mutateAsync(others)
					if (res.imported.length > 0) {
						toast.success(`Uploaded ${res.imported.length} file${res.imported.length === 1 ? '' : 's'}`)
					}
					for (const s of res.skipped) toast.error(`Skipped ${s.path}: ${s.reason}`)
				}
				for (const zip of zips) {
					const res = await zipUpload.mutateAsync(zip)
					if (res.imported.length > 0) {
						toast.success(`Imported ${res.imported.length} entries from ${zip.name}`)
					}
					for (const s of res.skipped) toast.error(`Skipped ${s.path}: ${s.reason}`)
				}
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Upload failed')
			}
		},
		[upload, zipUpload]
	)

	const onPick = () => fileInputRef.current?.click()

	return (
		<>
			<Ariakit.MenuProvider placement="bottom-start">
				<Ariakit.MenuButton render={trigger as React.ReactElement} />
				<Ariakit.Menu
					gutter={gutter}
					className={
						menuClassName ??
						'z-50 min-w-[240px] rounded-xl border border-[#e6e6e6] bg-(--cards-bg) p-1 text-sm shadow-xl dark:border-[#222324] dark:bg-[#161718]'
					}
				>
					<Ariakit.MenuItem
						onClick={onPick}
						className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#f0f0f0] dark:hover:bg-[#1c1d1e]"
					>
						<Icon name="file-plus" height={15} width={15} className="text-[#666] dark:text-[#919296]" />
						Upload from device
					</Ariakit.MenuItem>
					<Ariakit.MenuItem
						onClick={() => addTextStore.show()}
						className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#f0f0f0] dark:hover:bg-[#1c1d1e]"
					>
						<Icon name="file-text" height={15} width={15} className="text-[#666] dark:text-[#919296]" />
						Add text content
					</Ariakit.MenuItem>
					<Ariakit.MenuItem
						onClick={() => githubStore.show()}
						className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#f0f0f0] dark:hover:bg-[#1c1d1e]"
					>
						<Icon name="github" height={15} width={15} className="text-[#666] dark:text-[#919296]" />
						Connect GitHub repo
					</Ariakit.MenuItem>
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				hidden
				onChange={(e) => {
					const list = e.target.files ? Array.from(e.target.files) : []
					void handleFiles(list)
					if (fileInputRef.current) fileInputRef.current.value = ''
				}}
			/>
			<AddTextContentModal dialogStore={addTextStore} projectId={projectId} />
			<GitHubConnectModal dialogStore={githubStore} projectId={projectId} />
		</>
	)
}
