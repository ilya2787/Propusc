import { type FC, type PropsWithChildren, useEffect, useId, useRef } from 'react'
import { Transition } from 'react-transition-group'
import { ICON } from '../icon/Icon'
import './ModalStyle.scss'

interface ModalContentType extends PropsWithChildren {
	modalIsOpen: boolean
	onClose: () => void
	Title: string
	size?: 'sm' | 'md' | 'lg' | 'xl'
}

const ModalWindows: FC<ModalContentType> = ({
	modalIsOpen,
	onClose,
	Title,
	children,
	size = 'md',
}) => {
	const titleId = useId()
	const closeButtonRef = useRef<HTMLButtonElement>(null)
	const dialogRef = useRef<HTMLElement>(null)
	const onCloseRef = useRef(onClose)
	useEffect(() => { onCloseRef.current = onClose }, [onClose])

	useEffect(() => {
		if (!modalIsOpen) return
		const previousOverflow = document.body.style.overflow
		const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
		document.body.style.overflow = 'hidden'
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				onCloseRef.current()
				return
			}
			if (event.key !== 'Tab') return
			const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])]
			if (focusable.length === 0) {
				event.preventDefault()
				return
			}
			const first = focusable[0]
			const last = focusable.at(-1)!
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault()
				last.focus()
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault()
				first.focus()
			}
		}
		document.addEventListener('keydown', closeOnEscape)
		requestAnimationFrame(() => closeButtonRef.current?.focus())
		return () => {
			document.body.style.overflow = previousOverflow
			document.removeEventListener('keydown', closeOnEscape)
			previouslyFocused?.focus()
		}
	}, [modalIsOpen])

	return (
		<>
			<Transition in={modalIsOpen} timeout={350} unmountOnExit={true}>
				{state => (
					<div
						className={`Modal_background ${state}`}
						onMouseDown={event => {
							if (event.target === event.currentTarget) onClose()
						}}
					>
						<section ref={dialogRef} className={`Modal_container Modal_container--${size}`} role='dialog' aria-modal='true' aria-labelledby={titleId}>
							<header className='Modal_header'>
								<div><span className='Modal_header--eyebrow'>Пропуска</span><h1 className='Modal_container--title' id={titleId}>{Title}</h1></div>
							<button ref={closeButtonRef} type='button' onClick={onClose} className='btnClosed' aria-label='Закрыть окно'>
								{ICON.Exit}
							</button>
							</header>
							<div className='Modal_content'>
								{children}
							</div>
						</section>
					</div>
				)}
			</Transition>
		</>
	)
}

export default ModalWindows
