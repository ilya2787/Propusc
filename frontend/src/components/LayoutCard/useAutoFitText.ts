import { useLayoutEffect, useRef } from 'react'

export const useAutoFitText = (
	cssVariable: string,
	maximumSize: number,
	dependencies: unknown[],
	minimumSize = 8,
) => {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		const element = ref.current
		if (!element) return

		let frame = 0
		const fit = () => {
			cancelAnimationFrame(frame)
			frame = requestAnimationFrame(() => {
				element.style.setProperty(cssVariable, `${maximumSize}px`)
				const availableWidth = element.clientWidth
				const contentWidth = Math.max(
					...Array.from(element.children).map(child => child.scrollWidth),
					0,
				)
				if (!availableWidth || !contentWidth) return
				const fittedSize = Math.max(
					minimumSize,
					Math.min(maximumSize, Math.floor(maximumSize * availableWidth / contentWidth)),
				)
				element.style.setProperty(cssVariable, `${fittedSize}px`)
			})
		}

		fit()
		const observer = new ResizeObserver(fit)
		observer.observe(element)
		return () => {
			cancelAnimationFrame(frame)
			observer.disconnect()
		}
	// The caller supplies values that change the measured text or its constraints.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cssVariable, maximumSize, minimumSize, ...dependencies])

	return ref
}
