import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { dashboardAPI } from '~/containers/ProDashboard/services/DashboardAPI'
import { generateItemId } from '~/containers/ProDashboard/utils/dashboardUtils'
import { useAuthContext } from '~/containers/Subscribtion/auth'

type DatasetType = 'dexs' | 'perps' | 'options' | 'aggregators' | 'bridge-aggregators'

const getDatasetTypeFromPath = (pathname: string): DatasetType | null => {
	if (pathname.includes('/dexs')) return 'dexs'
	if (pathname.includes('/perps')) return 'perps'
	if (pathname.includes('/options')) return 'options'
	if (pathname.includes('/dex-aggregators')) return 'aggregators'
	if (pathname.includes('/bridge-aggregators')) return 'bridge-aggregators'
	return null
}

const getDashboardName = (datasetType: DatasetType): string => {
	const names = {
		dexs: 'DEX Volume Dashboard',
		perps: 'Perp Volume Dashboard',
		options: 'Options Volume Dashboard',
		aggregators: 'Aggregators Dashboard',
		'bridge-aggregators': 'Bridge Aggregators Dashboard'
	}
	return names[datasetType] || 'New Dashboard'
}

export const useDashboardCreation = () => {
	const router = useRouter()
	const { authorizedFetch, isAuthenticated } = useAuthContext()

	const createMutation = useMutation({
		mutationFn: async (datasetType: DatasetType) => {
			if (!authorizedFetch) {
				throw new Error('Not authenticated')
			}

			const tableItem = {
				id: generateItemId('table', datasetType),
				kind: 'table' as const,
				tableType: 'dataset' as const,
				chains: [],
				datasetType,
				colSpan: 2 as const
			}

			const dashboard = await dashboardAPI.createDashboard(
				{
					items: [tableItem],
					dashboardName: getDashboardName(datasetType)
				},
				authorizedFetch
			)

			return dashboard
		},
		onSuccess: (dashboard) => {
			toast.success('Dashboard created successfully')
			router.push(`/pro/${dashboard.id}`)
		},
		onError: (error: Error) => {
			console.error('Error creating dashboard:', error)
			toast.error('Failed to create dashboard. Please try again.')
		}
	})

	const createDashboardWithDataset = useCallback(() => {
		const datasetType = getDatasetTypeFromPath(router.pathname)
		if (!datasetType) {
			console.error('Unknown dataset type for path:', router.pathname)
			toast.error('Unable to determine dataset type for this page')
			return
		}

		if (!authorizedFetch) {
			toast.error('Please sign in to create dashboards')
			return
		}

		const loadingToast = toast.loading('Creating dashboard and preparing to redirect...')

		createMutation.mutate(datasetType, {
			onSettled: () => {
				toast.dismiss(loadingToast)
			}
		})
	}, [router.pathname, authorizedFetch, createMutation])

	return {
		createDashboardWithDataset,
		isAuthenticated,
		isLoading: createMutation.isPending
	}
}
