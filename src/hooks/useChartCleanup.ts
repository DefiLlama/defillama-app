import * as echarts from 'echarts/core'
import { useEffect, useRef } from 'react'

export function useChartCleanup(id: string, onCleanup?: () => void) {
	const onCleanupRef = useRef(onCleanup)
	useEffect(() => {
		onCleanupRef.current = onCleanup
	})

	useEffect(() => {
		return () => {
			const node = document.getElementById(id)
			if (node) {
				const instance = echarts.getInstanceByDom(node)
				instance?.dispose()
			}
			onCleanupRef.current?.()
		}
	}, [id])
}
