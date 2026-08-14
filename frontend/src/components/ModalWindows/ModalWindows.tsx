import { type FC, type PropsWithChildren, useContext, useEffect, useId, useRef } from 'react'
import { Transition } from 'react-transition-group'
import { AppContext } from '../../App'
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
	const MainContext = useContext(AppContext)
	const theme = MainContext.theme
	const titleId = useId()
	const closeButtonRef = useRef<HTMLButtonElement>(null)
	const onCloseRef = useRef(onClose)
	useEffect(() => { onCloseRef.current = onClose }, [onClose])

	useEffect(() => {
		if (!modalIsOpen) return
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onCloseRef.current()
		}
		document.addEventListener('keydown', closeOnEscape)
		requestAnimationFrame(() => closeButtonRef.current?.focus())
		return () => {
			document.body.style.overflow = previousOverflow
			document.removeEventListener('keydown', closeOnEscape)
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
						<section className={`Modal_container Modal_container--${size}`} role='dialog' aria-modal='true' aria-labelledby={titleId} id={theme}>
							<header className='Modal_header'>
								<div><span className='Modal_header--eyebrow'>Пропуска</span><h1 className='Modal_container--title' id={titleId}>{Title}</h1></div>
							<button ref={closeButtonRef} onClick={onClose} className='btnClosed' aria-label='Закрыть окно'>
								{ICON.Exit}
							</button>
							</header>
							<div className='Modal_content' id={theme}>
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
