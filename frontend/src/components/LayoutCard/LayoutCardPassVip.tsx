import { useContext, useEffect, useRef, type FC } from 'react'
import { Context } from '../../Page/Card/CardAll'
import { ICON } from '../icon/Icon'
import './StyleCard.scss'

interface TypeProps {
	Number_Tabs: number
	NewDate: string
	CurrentSingleOrganization: string
	CurrentSinglePost: string
	LastName: string
	FirstName: string
	Patronymic: string
	FilePhoto?: string
	Print: boolean
}

const layoutCardPassVip: FC<TypeProps> = ({
	Number_Tabs,
	NewDate,
	CurrentSingleOrganization,
	CurrentSinglePost,
	LastName,
	FirstName,
	Patronymic,
	FilePhoto,
	Print,
}) => {
	const AllContext = useContext(Context)
	const FocusOrganization = AllContext.FocusOrganization
	const FocusPost = AllContext.FocusPost
	const NameDirector = AllContext.NameDirector
	const PostDirector = AllContext.PostDirector

	const RefBlockCard = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (FocusOrganization || FocusPost) {
			RefBlockCard.current?.classList.add('Active')
			RefBlockCard.current?.classList.remove('Closed')
		} else {
			RefBlockCard.current?.classList.remove('Active')
			RefBlockCard.current?.classList.add('Closed')
		}
	}, [FocusOrganization, FocusPost])

	return (
		<div
			ref={RefBlockCard}
			className={Print ? 'layoutCardPassVip__Print' : 'layoutCardPassVip'}
		>
			<div
				className={
					Print ? 'layoutCardPassVip__Print--Front' : 'layoutCardPassVip--Front'
				}
			>
				<h3
					className={
						Print
							? 'layoutCardPassVip__Print--Front--title'
							: 'layoutCardPassVip--Front--title'
					}
				>
					Правительство <br /> Калининградской области
				</h3>
				<div
					className={
						Print
							? 'layoutCardPassVip__Print--Front--NumberCard'
							: 'layoutCardPassVip--Front--NumberCard'
					}
				>
					<p>Служебное удостоверение № </p>
					<p>{Number_Tabs}</p>
				</div>
				<p
					className={
						Print
							? 'layoutCardPassVip__Print--Front--text'
							: 'layoutCardPassVip--Front--text'
					}
				>
					Предъявитель настоящего удостоверения
				</p>
				<div
					className={
						Print
							? 'layoutCardPassVip__Print--Front--Name'
							: 'layoutCardPassVip--Front--Name'
					}
				>
					<p>{LastName}</p>
					<p>{FirstName}</p>
					<p>{Patronymic}</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPassVip__Print--Front--Date'
							: 'layoutCardPassVip--Front--Date'
					}
				>
					<p>Дата выдачи:</p>
					<p>{NewDate}</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPassVip__Print--Front--Photo'
							: 'layoutCardPassVip--Front--Photo'
					}
				>
					{FilePhoto ? (
						<img src={`${import.meta.env.VITE_APP_SERVER}/Photo/${FilePhoto}`} alt={FilePhoto} />
					) : (
						<span>{ICON.Photo}</span>
					)}
				</div>
			</div>
			<div
				className={
					Print ? 'layoutCardPassVip__Print--Back' : 'layoutCardPassVip--Back'
				}
			>
				<div
					className={
						Print
							? 'layoutCardPassVip__Print--Back--Organization'
							: 'layoutCardPassVip--Back--Organization'
					}
				>
					<p>{CurrentSingleOrganization}</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPassVip__Print--Back--Post'
							: 'layoutCardPassVip--Back--Post'
					}
				>
					<p>{CurrentSinglePost}</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPassVip__Print--Back--Director'
							: 'layoutCardPassVip--Back--Director'
					}
				>
					<p>{PostDirector}</p>
					<p>{NameDirector}</p>
				</div>
			</div>
		</div>
	)
}

export default layoutCardPassVip
