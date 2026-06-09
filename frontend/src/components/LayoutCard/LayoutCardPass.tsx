import { useContext, type FC } from 'react'
import { ICON } from '../icon/Icon'
import './StyleCard.scss'
import { Context } from '../../Page/Card/CardAll'

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

const LayoutCardPass: FC<TypeProps> = ({
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
	const NameDirector = AllContext.NameDirector
	const PostDirector = AllContext.PostDirector
	return (
		<div className={Print ? 'layoutCardPass__Print' : 'layoutCardPass'}>
			<div
				className={
					Print ? 'layoutCardPass__Print--Card' : 'layoutCardPass--Card'
				}
			>
				<div
					className={
						Print
							? 'layoutCardPass__Print--Card--Title'
							: 'layoutCardPass--Card--Title'
					}
				>
					<p>Пропуск</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPass__Print--Card--Number'
							: 'layoutCardPass--Card--Number'
					}
				>
					<p>№</p>
					<p>{Number_Tabs}</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPass__Print--Card--Date'
							: 'layoutCardPass--Card--Date'
					}
				>
					<p>{NewDate}</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPass__Print--Card--Organization'
							: 'layoutCardPass--Card--Organization'
					}
				>
					<p>{CurrentSingleOrganization}</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPass__Print--Card--Post'
							: 'layoutCardPass--Card--Post'
					}
				>
					<p>{CurrentSinglePost}</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPass__Print--Card--Name'
							: 'layoutCardPass--Card--Name'
					}
				>
					<p>{LastName}</p>
					<p>{FirstName}</p>
					<p>{Patronymic}</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPass__Print--Card--Director'
							: 'layoutCardPass--Card--Director'
					}
				>
					<p>
						{PostDirector}
					</p>
					<p>{NameDirector}</p>
				</div>
				<div
					className={
						Print
							? 'layoutCardPass__Print--Card--Photo'
							: 'layoutCardPass--Card--Photo'
					}
				>
					{FilePhoto ? (
						<img src={`${import.meta.env.VITE_APP_SERVER}/Photo/${FilePhoto}`} alt={FilePhoto} />
					) : (
						<span>{ICON.Photo}</span>
					)}
				</div>
			</div>
		</div>
	)
}

export default LayoutCardPass
