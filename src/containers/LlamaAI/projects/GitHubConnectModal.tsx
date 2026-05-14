import * as Ariakit from '@ariakit/react'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useConnectGithubSource, useGithubInstallations, useGithubRepos, useStartGithubInstall } from './hooks'

interface GitHubConnectModalProps {
	dialogStore: Ariakit.DialogStore
	projectId: string
}

export function GitHubConnectModal({ dialogStore, projectId }: GitHubConnectModalProps) {
	const isOpen = Ariakit.useStoreState(dialogStore, 'open')

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog
				className="fixed top-1/2 left-1/2 z-50 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#e6e6e6] bg-(--cards-bg) p-5 shadow-2xl dark:border-[#222324]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-md" />}
			>
				{isOpen ? <GitHubConnectForm key={projectId} dialogStore={dialogStore} projectId={projectId} /> : null}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}

function GitHubConnectForm({ dialogStore, projectId }: GitHubConnectModalProps) {
	const installs = useGithubInstallations()
	const [selectedInstallId, setSelectedInstallId] = useState<number | null>(null)
	const [selectedRepo, setSelectedRepo] = useState('')
	const [repoQuery, setRepoQuery] = useState('')
	const [branch, setBranch] = useState('')
	const [installing, setInstalling] = useState(false)
	const defaultInstallId = installs.data?.[0]?.installation_id ?? null
	const effectiveInstallId = selectedInstallId ?? defaultInstallId
	const repos = useGithubRepos(effectiveInstallId)
	const connect = useConnectGithubSource(projectId)
	const startInstall = useStartGithubInstall()

	const filteredRepos = useMemo(() => {
		const all = repos.data ?? []
		const q = repoQuery.trim().toLowerCase()
		if (!q) return all
		return all.filter((r) => r.full_name.toLowerCase().includes(q))
	}, [repos.data, repoQuery])

	const repoMeta = useMemo(
		() => repos.data?.find((r) => r.full_name === selectedRepo) ?? null,
		[repos.data, selectedRepo]
	)

	const onConnect = async () => {
		if (!selectedRepo || !effectiveInstallId) return
		const repo = repos.data?.find((r) => r.full_name === selectedRepo)
		if (!repo) return
		try {
			await connect.mutateAsync({
				owner: repo.full_name.split('/')[0],
				repo: repo.name,
				branch: branch.trim() || repo.default_branch,
				installation_id: effectiveInstallId
			})
			toast.success(`Connected ${repo.full_name}`)
			dialogStore.hide()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to connect repository')
		}
	}

	const onStartInstall = async () => {
		try {
			setInstalling(true)
			const returnTo = `/ai/projects/${projectId}?tab=sources&connectGithub=1`
			const { install_url } = await startInstall(returnTo)
			window.location.href = install_url
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Could not start GitHub install')
			setInstalling(false)
		}
	}

	const hasInstalls = (installs.data?.length ?? 0) > 0

	return (
		<>
			<header className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					<Icon name="github" height={18} width={18} />
					<div>
						<h2 className="text-base font-semibold text-(--text-primary)">Connect a GitHub repo</h2>
						<p className="mt-0.5 text-xs text-[#666] dark:text-[#919296]">
							Read-only access. Files are fetched on demand, never written back.
						</p>
					</div>
				</div>
				<Ariakit.DialogDismiss className="-mr-1.5 rounded-lg p-2 text-[#666] transition-colors hover:bg-black/[0.05] hover:text-black dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white">
					<Icon name="x" height={16} width={16} />
				</Ariakit.DialogDismiss>
			</header>

			<div className="mt-4 flex flex-col gap-4">
				{installs.isLoading ? (
					<div className="flex items-center gap-2 text-xs text-[#666] dark:text-[#919296]">
						<LoadingSpinner size={12} /> Loading installations…
					</div>
				) : !hasInstalls ? (
					<div className="flex flex-col gap-3 rounded-md border border-dashed border-[#e6e6e6] p-4 text-xs text-[#666] dark:border-[#2a2b2c] dark:text-[#919296]">
						<p>No GitHub apps installed yet. Install LlamaAI Workspace on your GitHub account to grant repo access.</p>
						<button
							type="button"
							onClick={() => void onStartInstall()}
							disabled={installing}
							className="flex items-center justify-center gap-2 self-start rounded-md border border-[#1a1a1a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
						>
							{installing ? <LoadingSpinner size={12} /> : <Icon name="github" height={14} width={14} />}
							Install GitHub App
						</button>
					</div>
				) : (
					<>
						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-[#444] dark:text-[#c5c5c5]">Installation</span>
							<select
								value={effectiveInstallId ?? ''}
								onChange={(e) => {
									setSelectedInstallId(Number(e.target.value))
									setSelectedRepo('')
									setRepoQuery('')
								}}
								className="rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-3 py-2 text-sm text-inherit focus:border-(--old-blue) focus:outline-none dark:border-[#2a2b2c]"
							>
								{installs.data?.map((i) => (
									<option key={i.installation_id} value={i.installation_id}>
										{i.account_login}
									</option>
								))}
							</select>
						</label>

						<div className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-[#444] dark:text-[#c5c5c5]">Repository</span>
							{repos.isLoading ? (
								<div className="flex items-center gap-2 text-xs text-[#666] dark:text-[#919296]">
									<LoadingSpinner size={12} /> Loading repositories…
								</div>
							) : (
								<Ariakit.ComboboxProvider
									value={repoQuery}
									setValue={setRepoQuery}
									selectedValue={selectedRepo}
									setSelectedValue={(value) => {
										if (typeof value === 'string') setSelectedRepo(value)
									}}
								>
									<Ariakit.Combobox
										placeholder={selectedRepo || 'Search repositories…'}
										className="rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-3 py-2 text-sm text-inherit placeholder:text-[#999] focus:border-(--old-blue) focus:outline-none dark:border-[#2a2b2c] dark:placeholder:text-[#555]"
									/>
									<Ariakit.ComboboxPopover
										gutter={4}
										sameWidth
										className="z-[60] max-h-64 overflow-y-auto rounded-md border border-[#e6e6e6] bg-(--cards-bg) py-1 shadow-lg dark:border-[#2a2b2c]"
									>
										{filteredRepos.length === 0 ? (
											<div className="px-3 py-2 text-xs text-[#999] dark:text-[#666]">No repositories match.</div>
										) : (
											filteredRepos.map((r) => (
												<Ariakit.ComboboxItem
													key={r.full_name}
													value={r.full_name}
													className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-inherit data-[active-item]:bg-[#f0f0f0] dark:data-[active-item]:bg-[#222324]"
												>
													<span className="truncate">{r.full_name}</span>
													{r.private ? (
														<span className="ml-auto rounded bg-[#e6e6e6] px-1 py-0.5 text-[10px] text-[#666] dark:bg-[#222324] dark:text-[#919296]">
															private
														</span>
													) : null}
												</Ariakit.ComboboxItem>
											))
										)}
									</Ariakit.ComboboxPopover>
								</Ariakit.ComboboxProvider>
							)}
						</div>

						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-[#444] dark:text-[#c5c5c5]">Branch (optional)</span>
							<input
								value={branch}
								onChange={(e) => setBranch(e.target.value)}
								placeholder={
									repoMeta?.default_branch ? `defaults to ${repoMeta.default_branch}` : 'defaults to default branch'
								}
								className="rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-3 py-2 text-sm text-inherit placeholder:text-[#999] focus:border-(--old-blue) focus:outline-none dark:border-[#2a2b2c] dark:placeholder:text-[#555]"
							/>
						</label>

						<button
							type="button"
							onClick={() => void onStartInstall()}
							disabled={installing}
							className="self-start text-xs text-(--old-blue) underline-offset-2 hover:underline disabled:opacity-50"
						>
							Manage installations →
						</button>
					</>
				)}

				<footer className="mt-1 flex justify-end gap-2">
					<Ariakit.DialogDismiss
						type="button"
						className="rounded-md px-3 py-1.5 text-xs text-[#666] hover:bg-[#f0f0f0] dark:text-[#919296] dark:hover:bg-[#222324]"
					>
						Cancel
					</Ariakit.DialogDismiss>
					{hasInstalls ? (
						<button
							type="button"
							onClick={() => void onConnect()}
							disabled={!selectedRepo || connect.isPending}
							className="flex items-center gap-1.5 rounded-md border border-(--old-blue) bg-(--old-blue) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-(--old-blue)/90 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{connect.isPending ? <LoadingSpinner size={12} /> : null}
							Connect
						</button>
					) : null}
				</footer>
			</div>
		</>
	)
}
