import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { useUploadProjectFiles } from './hooks'

function isArchiveFile(file: File): boolean {
	return /\.(zip|tar|tgz|gz|7z|rar)$/i.test(file.name) || file.type === 'application/zip'
}

export function useProjectFileUpload(projectId: string) {
	const upload = useUploadProjectFiles(projectId)

	const handleFiles = useCallback(
		async (fileList: File[]) => {
			if (fileList.length === 0) return

			const archives = fileList.filter(isArchiveFile)
			const files = fileList.filter((file) => !isArchiveFile(file))

			if (archives.length > 0) {
				toast.error('Archive uploads are not supported. Unzip and drop the folder instead.')
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
