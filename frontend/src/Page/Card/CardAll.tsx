import axios from 'axios'
import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
} from 'react'
import { useReactToPrint } from 'react-to-print'
import { AppContext } from '../../App'
import { A4Sheet } from '../../components/A4Sheet/A4Sheet'
import { ICON } from '../../components/icon/Icon'
import ModalWindows from '../../components/ModalWindows/ModalWindows'
import {
	DeleteCard,
	DeleteListCardNatification,
	warningListPrint,
} from '../../components/natificationMesseg/natificationMessag'
import type { IOption } from '../../components/SelectItem/TypeSelect'
import type { TDirector, TListPrint } from '../../components/type/Type'
import CardPass from './CardPass'
import CardPassVip from './CardPassVip'
import './CardStyle.scss'

type TypeContext = {
	CurrentSingleOrganization: string
	setCurrentSingleOrganization: Dispatch<SetStateAction<string>>
	CurrentSinglePost: string
	setCurrentSinglePost: Dispatch<SetStateAction<string>>
	Number_Tabs: number
	setNumber_Tabs: Dispatch<SetStateAction<number>>
	LastName: string
	setLastName: Dispatch<SetStateAction<string>>
	FirstName: string
	setFirstName: Dispatch<SetStateAction<string>>
	Patronymic: string
	setPatronymic: Dispatch<SetStateAction<string>>
	NewDate: string
	setNewDate: Dispatch<SetStateAction<string>>
	FilePhoto: string
	setFilePhoto: Dispatch<SetStateAction<string>>
	ListPrint: TListPrint[]
	setListPrint: Dispatch<SetStateAction<TListPrint[]>>
	Organization: string
	Post: string
	CleaningForm: () => void
	ListOrganization: IOption[]
	setListOrganization: Dispatch<SetStateAction<IOption[]>>
	ListPost: IOption[]
	setListPost: Dispatch<SetStateAction<IOption[]>>
	FocusOrganization: boolean
	setFocusOrganization: Dispatch<SetStateAction<boolean>>
	FocusPost: boolean
	setFocusPost: Dispatch<SetStateAction<boolean>>
	PostDirector: string
	setPostDirector: Dispatch<SetStateAction<string>>
	NameDirector: string
	setNameDirector: Dispatch<SetStateAction<string>>
}
export const Context = createContext<TypeContext>({
	CurrentSingleOrganization: '',
	setCurrentSingleOrganization: () => {},
	CurrentSinglePost: '',
	setCurrentSinglePost: () => {},
	Number_Tabs: 0,
	setNumber_Tabs: () => {},
	LastName: '',
	setLastName: () => {},
	FirstName: '',
	setFirstName: () => {},
	Patronymic: '',
	setPatronymic: () => {},
	NewDate: '',
	setNewDate: () => {},
	FilePhoto: '',
	setFilePhoto: () => {},
	ListPrint: [],
	setListPrint: () => {},
	Organization: '',
	Post: '',
	CleaningForm: () => {},
	ListOrganization: [],
	setListOrganization: () => [],
	ListPost: [],
	setListPost: () => [],
	FocusOrganization: false,
	setFocusOrganization: () => {},
	FocusPost: false,
	setFocusPost: () => {},
	PostDirector: '',
	setPostDirector: () => {},
	NameDirector: '',
	setNameDirector: () => {},
})

const CardAll = () => {
	const ContextMain = useContext(AppContext)
	const theme = ContextMain.theme

	const [ActiveCardPass, setActiveCardPass] = useState<boolean>(false)
	const [ActiveCardPassVip, setActiveCardPassVip] = useState<boolean>(false)
	const [OpenModal, setOpenModal] = useState<boolean>(false)
	const Pass = useRef<HTMLDivElement>(null)
	const PassVip = useRef<HTMLDivElement>(null)
	const printRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		ActiveCardPass
			? Pass.current?.classList.add('Active')
			: Pass.current?.classList.remove('Active')
		ActiveCardPassVip
			? PassVip.current?.classList.add('Active')
			: PassVip.current?.classList.remove('Active')
	}, [ActiveCardPass, ActiveCardPassVip])

	//Данные на пропуск
	const [CurrentSingleOrganization, setCurrentSingleOrganization] =
		useState<string>('')
	const [CurrentSinglePost, setCurrentSinglePost] = useState<string>('')
	const [Number_Tabs, setNumber_Tabs] = useState<number>(0)
	const [LastName, setLastName] = useState<string>('')
	const [FirstName, setFirstName] = useState<string>('')
	const [Patronymic, setPatronymic] = useState<string>('')
	const [NewDate, setNewDate] = useState<string>('')
	const [FilePhoto, setFilePhoto] = useState<string>('')
	const [Organization, setOrganization] = useState<string>('')
	const [Post, setPost] = useState<string>('')
	////////////

	//Фокус объектов
	const [FocusOrganization, setFocusOrganization] = useState<boolean>(false)
	const [FocusPost, setFocusPost] = useState<boolean>(false)

	////////////

	const [ListOrganization, setListOrganization] = useState<IOption[]>([])
	const [ListPost, setListPost] = useState<IOption[]>([])

	const ListBDOrganization = async () => {
		await axios
			.get<IOption[]>(`${import.meta.env.VITE_APP_SERVER}/AllListOrganization`)
			.then(res => setListOrganization(res.data))
			.catch(err => console.log(err))
	}
	useEffect(() => {
		ListBDOrganization()
	}, [setListOrganization])

	const ListBDPost = async () => {
		await axios
			.get<IOption[]>(`${import.meta.env.VITE_APP_SERVER}/AllListPost`)
			.then(res => setListPost(res.data))
			.catch(err => console.log(err))
	}
	useEffect(() => {
		ListBDPost()
	}, [setListPost])

	//Общий список на печать
	const [ListPrint, setListPrint] = useState<TListPrint[]>([])
	const [ActivePrintVip, setActivePrintVip] = useState<boolean>(false)
	const [NumberObjectPage, setNumberObjectPage] = useState<number>(0)

	useEffect(() => {
		if (ActiveCardPass) {
			setActivePrintVip(false)
			setNumberObjectPage(10)
		}
		if (ActiveCardPassVip) {
			setActivePrintVip(true)
			setNumberObjectPage(5)
		}
	}, [ActiveCardPass, ActiveCardPassVip])

	//Удаление строки
	const deleteLineCard = (Number_Tabs: number) => {
		setListPrint(ListPrint.filter(item => item.Number_Tabs !== Number_Tabs))
		DeleteCard()
	}

	const DeleteListCard = () => {
		if (ListPrint.length > 0) {
			setListPrint([])
			DeleteListCardNatification()
		}
	}

	useEffect(() => {
		ListOrganization.map(data => {
			CurrentSingleOrganization === data.value && setOrganization(data.label)
		})
		ListPost.map(data => {
			CurrentSinglePost === data.value && setPost(data.label)
		})
	}, [CurrentSingleOrganization, CurrentSinglePost])

	const CleaningForm = () => {
		setCurrentSingleOrganization('')
		setCurrentSinglePost('')
		setLastName('')
		setFirstName('')
		setPatronymic('')
		setNewDate('')
		setNumber_Tabs(0)
		setFilePhoto('')
		setOrganization('')
		setPost('')
	}

	// Печать
	const handlePrint = useReactToPrint({
		content: () => printRef.current,
	})

	//Выгрузка руководителя
	const [PostDirector, setPostDirector] = useState<string>('')
	const [NameDirector, setNameDirector] = useState<string>('')

	useEffect(() => {
		axios
			.get<TDirector[]>(`${import.meta.env.VITE_APP_SERVER}/Director`)
			.then(res => {
				setNameDirector(res.data[0].Name)
				setPostDirector(res.data[0].Post)
			})
	}, [setNameDirector, setPostDirector])

	return (
		<Context.Provider
			value={{
				CurrentSingleOrganization,
				setCurrentSingleOrganization,
				CurrentSinglePost,
				setCurrentSinglePost,
				Number_Tabs,
				setNumber_Tabs,
				LastName,
				setLastName,
				FirstName,
				setFirstName,
				Patronymic,
				setPatronymic,
				NewDate,
				setNewDate,
				FilePhoto,
				setFilePhoto,
				ListPrint,
				setListPrint,
				Organization,
				Post,
				CleaningForm,
				ListOrganization,
				setListOrganization,
				ListPost,
				setListPost,
				FocusOrganization,
				setFocusOrganization,
				FocusPost,
				setFocusPost,
				PostDirector,
				setPostDirector,
				NameDirector,
				setNameDirector,
			}}
		>
			<div className='MainCard' id={theme}>
				<div className='MainCard--headerInfo'>
					<div className='MainCard--headerInfo--TypePassCard' id={theme}>
						<h1>Выберите тип пропуска</h1>
						<div
							className='MainCard--headerInfo--TypePassCard--content'
							id={theme}
						>
							<div
								className='MainCard--headerInfo--TypePassCard--content--Item'
								ref={Pass}
								onClick={() => {
									if (ActiveCardPass === false || ActiveCardPassVip === true) {
										setActiveCardPass(true)
										setActiveCardPassVip(false)
									}
								}}
								id={theme}
							>
								<img src='/img/maket1.png' alt='' />
								<div className='MainCard--headerInfo--TypePassCard--content--Item--text'>
									<h2>Пропуск</h2>
									<p>Односторонний пропуск с лицевой стороной</p>
								</div>
							</div>
							<div
								className='MainCard--headerInfo--TypePassCard--content--Item'
								ref={PassVip}
								onClick={() => {
									if (ActiveCardPassVip === false || ActiveCardPass === true) {
										setActiveCardPassVip(true)
										setActiveCardPass(false)
									}
								}}
								id={theme}
							>
								<img src='/img/maket2.png' alt='' />
								<div className='MainCard--headerInfo--TypePassCard--content--Item--text'>
									<h2>Удостоверение</h2>
									<p>
										Двустороннее удостоверение с лицевой и обратной стороной
									</p>
								</div>
							</div>
						</div>
					</div>
					<div className='MainCard--headerInfo--ListPrintCard' id={theme}>
						<h1>Список пропусков на печать</h1>
						<div
							className='MainCard--headerInfo--ListPrintCard--tables'
							id={theme}
						>
							<table className='table' id={theme}>
								<thead>
									<tr>
										<th>Таб. №</th>
										<th>ФИО</th>
										<th>Должность</th>
										<th>Организация</th>
										<th>Удалить</th>
									</tr>
								</thead>
								<tbody>
									{ListPrint.map((data, i) => (
										<tr key={i}>
											<td>{data.Number_Tabs}</td>
											<td>{`${data.LastName} ${data.FirstName} ${data.Patronymic}`}</td>
											<td>{data.Post}</td>
											<td>
												<div style={{ width: '300px' }}>
													{data.Organization}
												</div>
											</td>
											<td className='DeleteListUserCard'>
												<button
													onClick={() => {
														deleteLineCard(data.Number_Tabs)
													}}
												>
													{ICON.DeleteUser}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className='MainCard--headerInfo--ListPrintCard--BTN'>
							<button
								className='MainCard--headerInfo--ListPrintCard--BTN--Clear'
								onClick={() => DeleteListCard()}
								id={theme}
							>
								<span>{ICON.DeleteCard}</span>Отчистить список
							</button>
							<button
								className='MainCard--headerInfo--ListPrintCard--BTN--View'
								onClick={() => {
									if (ListPrint.length > 0) {
										setOpenModal(true)
									} else {
										warningListPrint()
									}
								}}
							>
								<span>{ICON.Doc}</span>Предварительный просмотр
							</button>
						</div>
					</div>
				</div>
				<div>
					{ActiveCardPass && <CardPass />}
					{ActiveCardPassVip && <CardPassVip />}
				</div>
			</div>
			<ModalWindows
				Title={'Предварительный просмотр'}
				modalIsOpen={OpenModal}
				onClose={() => setOpenModal(false)}
			>
				<div className='Print'>
					<div className='Print--content'>
						<A4Sheet
							ref={printRef}
							ActivePrintVip={ActivePrintVip}
							NumberObject={NumberObjectPage}
						/>
					</div>
					<button className='Print_BTN' onClick={handlePrint}>
						<span>{ICON.Print}</span>Печать
					</button>
				</div>
			</ModalWindows>
		</Context.Provider>
	)
}
export default CardAll
