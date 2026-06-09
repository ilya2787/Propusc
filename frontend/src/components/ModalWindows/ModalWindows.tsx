import { type FC, type PropsWithChildren, useContext, useEffect } from 'react'
import { Transition } from 'react-transition-group'
import { AppContext } from '../../App'
import { ICON } from '../icon/Icon'
import './ModalStyle.scss'

interface ModalContentType extends PropsWithChildren {
	modalIsOpen: boolean
	onClose: () => void
	Title: string
}

const ModalWindows: FC<ModalContentType> = ({
	modalIsOpen,
	onClose,
	Title,
	children,
}) => {
	const MainContext = useContext(AppContext)
	const theme = MainContext.theme

	useEffect(() => {
		if (modalIsOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflowY = 'scroll'
			document.body.style.overflowX = 'hidden'
		}
	}, [modalIsOpen])

	return (
		<>
			<Transition in={modalIsOpen} timeout={350} unmountOnExit={true}>
				{state => (
					<div
						className={`Modal_background ${state}`}
						id='ContentModal'
						onClick={() => onClose()}
					>
						<div className='Modal_container' onClick={e => e.stopPropagation()}>
							<button onClick={() => onClose()} className='btnClosed'>
								{ICON.Exit}
							</button>
							<h1 className='Modal_container--title'>{Title}</h1>
							<div className='Modal_content' id={theme}>
								{children}
							</div>
						</div>
					</div>
				)}
			</Transition>
		</>
	)
}

export default ModalWindows
