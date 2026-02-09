import * as echarts from 'echarts/core'
import { useEffect } from 'react'

export function useChartCleanup(id: string, onCleanup?: () => void) {
	useEffect(() => {
		return () => {
			const node = document.getElementById(id)
			if (node) {
				const instance = echarts.getInstanceByDom(node)
				instance?.dispose()
			}
			onCleanup?.()
		}
	}, [id, onCleanup])
}
