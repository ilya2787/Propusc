import { useLayoutEffect, useRef } from 'react'

export const useAutoFitText = (
	cssVariable: string,
	maximumSize: number,
	dependencies: unknown[],
	minimumSize = 8,
	fitHeight = false,
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
				const contentWidth = () => Math.max(
					element.scrollWidth,
					...Array.from(element.children).map(child => child.scrollWidth),
				)
				if (!element.clientWidth) return

				if (!fitHeight) {
					const width = contentWidth()
					if (width <= element.clientWidth + 1) return
					const fittedSize = Math.max(
						minimumSize,
						Math.min(maximumSize, Math.floor(maximumSize * element.clientWidth / width)),
					)
					element.style.setProperty(cssVariable, `${fittedSize}px`)
					return
				}

				const overflows = () => {
					return contentWidth() > element.clientWidth + 1 ||
						(element.clientHeight > 0 && element.scrollHeight > element.clientHeight + 1)
				}
				if (!overflows()) return

				let low = minimumSize
				let high = maximumSize
				while (high - low > 0.25) {
					const candidate = (low + high) / 2
					element.style.setProperty(cssVariable, `${candidate}px`)
					if (overflows()) high = candidate
					else low = candidate
				}
				element.style.setProperty(cssVariable, `${Math.max(minimumSize, low)}px`)
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
	}, [cssVariable, maximumSize, minimumSize, fitHeight, ...dependencies])

	return ref
}
