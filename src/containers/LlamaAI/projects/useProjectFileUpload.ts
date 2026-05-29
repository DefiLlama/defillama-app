import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { useUploadProjectFiles } from './hooks'

const PROJECT_FILE_ACCEPT_EXTENSIONS = [
	'.md',
	'.mdx',
	'.txt',
	'.csv',
	'.json',
	'.js',
	'.jsx',
	'.ts',
	'.tsx',
	'.py',
	'.go',
	'.rs',
	'.sol',
	'.java',
	'.c',
	'.cc',
	'.cpp',
	'.h',
	'.hpp',
	'.cs',
	'.php',
	'.rb',
	'.swift',
	'.kt',
	'.kts',
	'.scala',
	'.sh',
	'.bash',
	'.zsh',
	'.fish',
	'.sql',
	'.html',
	'.css',
	'.scss',
	'.sass',
	'.less',
	'.yml',
	'.yaml',
	'.toml',
	'.xml',
	'.graphql',
	'.proto',
	'.vue',
	'.svelte'
] as const

const PROJECT_FILE_ACCEPT_TYPES = ['text/markdown', 'text/plain', 'text/csv', 'application/json'] as const

const PROJECT_FILE_ACCEPT_EXTENSION_SET = new Set<string>(PROJECT_FILE_ACCEPT_EXTENSIONS)
const PROJECT_FILE_ACCEPT_TYPE_SET = new Set<string>(PROJECT_FILE_ACCEPT_TYPES)
const PROJECT_FILE_ACCEPT_FILENAMES = new Set(['dockerfile', 'makefile'])

export const PROJECT_FILE_ACCEPT = [...PROJECT_FILE_ACCEPT_EXTENSIONS, ...PROJECT_FILE_ACCEPT_TYPES].join(',')

function isArchiveFile(file: File): boolean {
	return /\.(zip|tar|tgz|gz|7z|rar)$/i.test(file.name) || file.type === 'application/zip'
}

function getProjectFileName(file: File) {
	return ((file as any).webkitRelativePath || file.name).split('/').pop() ?? file.name
}

function isAcceptedProjectFile(file: File): boolean {
	if (PROJECT_FILE_ACCEPT_TYPE_SET.has(file.type)) return true

	const name = getProjectFileName(file).toLowerCase()
	if (PROJECT_FILE_ACCEPT_FILENAMES.has(name)) return true

	const extensionStart = name.lastIndexOf('.')
	if (extensionStart === -1) return false

	return PROJECT_FILE_ACCEPT_EXTENSION_SET.has(name.slice(extensionStart))
}

export function useProjectFileUpload(projectId: string) {
	const upload = useUploadProjectFiles(projectId)

	const handleFiles = useCallback(
		async (fileList: File[]) => {
			if (fileList.length === 0) return

			const archives = fileList.filter(isArchiveFile)
			const nonArchiveFiles = fileList.filter((file) => !isArchiveFile(file))
			const files = nonArchiveFiles.filter(isAcceptedProjectFile)
			const unsupported = nonArchiveFiles.filter((file) => !isAcceptedProjectFile(file))

			if (archives.length > 0) {
				toast.error('Archive uploads are not supported. Unzip and drop the folder instead.')
			}
			if (unsupported.length > 0) {
				toast.error(
					unsupported.length === 1
						? `Unsupported file type: ${getProjectFileName(unsupported[0])}`
						: `Skipped ${unsupported.length} unsupported files`
				)
			}
			if (files.length === 0) return

			try {
				const res = await upload.mutateAsync(files)
				if (res.imported.length > 0) {
					toast.success(`Uploaded ${res.imported.length} file${res.imported.length === 1 ? '' : 's'}`)
				}
				for (const skipped of res.skipped) {
					toast.error(`Skipped ${skipped.path}: ${skipped.reason}`)
				}
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Upload failed')
			}
		},
		[upload]
	)

	return {
		handleFiles,
		isUploading: upload.isPending
	}
}
