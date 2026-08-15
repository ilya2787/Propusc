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
import { deleteUploadedImage } from '../../api/images'
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
import { fetchTemplates, loadTemplates, TEMPLATE_CHANGE_EVENT, type PassTemplate } from '../../model/templates'
import { getA4PrintLayout } from '../../components/LayoutCard/cardDimensions'

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
	FilePhotoName: string
	setFilePhotoName: Dispatch<SetStateAction<string>>
	QrKey: string
	setQrKey: Dispatch<SetStateAction<string>>
	ListPrint: TListPrint[]
	setListPrint: Dispatch<SetStateAction<TListPrint[]>>
	Organization: string
	Post: string
	CleaningForm: (preserveUploadedPhoto?: boolean) => void
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
	SelectedTemplate: PassTemplate
}
// eslint-disable-next-line react-refresh/only-export-components
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
	FilePhotoName: '',
	setFilePhotoName: () => {},
	QrKey: '',
	setQrKey: () => {},
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
	SelectedTemplate: loadTemplates()[0],
})

const CardAll = () => {
	const ContextMain = useContext(AppContext)
	const theme = ContextMain.theme

	const [OpenModal, setOpenModal] = useState<boolean>(false)
	const [PrintDialogClosed, setPrintDialogClosed] = useState<boolean>(false)
	const [Templates, setTemplates] = useState(loadTemplates)
	const [SelectedTemplate, setSelectedTemplate] = useState(Templates[0])
	const printRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const refresh = () => setTemplates(loadTemplates())
		window.addEventListener(TEMPLATE_CHANGE_EVENT, refresh)
		void fetchTemplates().then(items => {
			setTemplates(items)
			setSelectedTemplate(current => items.find(item => item.id === current.id) ?? items[0])
		})
		return () => window.removeEventListener(TEMPLATE_CHANGE_EVENT, refresh)
	}, [])

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
	const [FilePhotoName, setFilePhotoName] = useState<string>('')
	const [QrKey, setQrKey] = useState<string>('')
	////////////

	//Фокус объектов
	const [FocusOrganization, setFocusOrganization] = useState<boolean>(false)
	const [FocusPost, setFocusPost] = useState<boolean>(false)

	////////////

	const [ListOrganization, setListOrganization] = useState<IOption[]>([])
	const [ListPost, setListPost] = useState<IOption[]>([])
	const Organization =
		ListOrganization.find(data => data.value === CurrentSingleOrganization)?.label ?? ''
	const Post = ListPost.find(data => data.value === CurrentSinglePost)?.label ?? ''

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
	const ActivePrintVip = SelectedTemplate.kind === 'certificate'
	const printLayout = getA4PrintLayout(SelectedTemplate, SelectedTemplate.kind)
	const NumberObjectPage = printLayout.cardsPerPage

	//Удаление строки
	const deleteLineCard = (Id: string) => {
		const deletedItems = ListPrint.filter(item => item.Id === Id)
		void Promise.allSettled(deletedItems.map(item => deleteUploadedImage(item.FilePhoto)))
		setListPrint(items => items.filter(item => item.Id !== Id))
		DeleteCard()
	}

	const DeleteListCard = () => {
		if (ListPrint.length > 0) {
			void Promise.allSettled([...new Set(ListPrint.map(item => item.FilePhoto))].map(deleteUploadedImage))
			setListPrint([])
			DeleteListCardNatification()
		}
	}

	const CleaningForm = (preserveUploadedPhoto = false) => {
		if (!preserveUploadedPhoto) void deleteUploadedImage(FilePhoto)
		setCurrentSingleOrganization('')
		setCurrentSinglePost('')
		setLastName('')
		setFirstName('')
		setPatronymic('')
		setNewDate('')
		setNumber_Tabs(0)
		setFilePhoto('')
		setFilePhotoName('')
		setQrKey('')
	}

	// Печать
	const handlePrint = useReactToPrint({
		content: () => printRef.current,
		onAfterPrint: () => setPrintDialogClosed(true),
	})
	const finishPrintAndCleanup = async () => {
		await Promise.allSettled([...new Set(ListPrint.map(item => item.FilePhoto))].map(deleteUploadedImage))
		setListPrint([])
		setPrintDialogClosed(false)
		setOpenModal(false)
		DeleteListCardNatification()
	}

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
				FilePhotoName,
				setFilePhotoName,
				QrKey,
				setQrKey,
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
				SelectedTemplate,
			}}
		>
			<div className='MainCard' id={theme}>
				<header className='MainCard__pageHeader'>
					<div>
						<span className='MainCard__eyebrow'>Оформление</span>
						<h1>Новый пропуск</h1>
						<p>Выберите шаблон, заполните данные сотрудника и добавьте готовый пропуск в очередь печати.</p>
					</div>
					<div className='MainCard__queueBadge' aria-label={`В очереди ${ListPrint.length}`}>
						<span>{ICON.Print}</span>
						<div><strong>{ListPrint.length}</strong><small>в очереди</small></div>
					</div>
				</header>
				<div className='MainCard--headerInfo'>
					<div className='MainCard--headerInfo--TypePassCard' id={theme}>
						<div className='MainCard__sectionTitle'>
							<span>1</span>
							<div><h2>Выберите шаблон</h2><p>Поля формы подстроятся автоматически</p></div>
						</div>
						<div
							className='MainCard--headerInfo--TypePassCard--content'
							id={theme}
						>
							{Templates.map(template => (
								<div
									key={template.id}
									className={`MainCard--headerInfo--TypePassCard--content--Item ${SelectedTemplate.id === template.id ? 'Active' : ''}`}
									onClick={() => {
										setSelectedTemplate(template)
									}}
									role='button'
									tabIndex={0}
									onKeyDown={event => event.key === 'Enter' && setSelectedTemplate(template)}
									id={theme}
								>
									<img src={template.kind === 'pass' ? '/img/maket1.png' : '/img/maket2.png'} alt='' />
									<div className='MainCard--headerInfo--TypePassCard--content--Item--text'>
										<h2>{template.name}</h2><p>{template.description}</p>
									</div>
								</div>
							))}
						</div>
						</div>
						</div>
					<div className='MainCard__workspace'>
					<div className='MainCard__sectionTitle'>
						<span>2</span>
						<div><h2>Заполните данные</h2><p>Изменения сразу отображаются в предпросмотре</p></div>
					</div>
					{SelectedTemplate.kind === 'pass' ? <CardPass /> : <CardPassVip />}
				</div>
				<div className='MainCard--headerInfo--ListPrintCard' id={theme}>
					<div className='MainCard__queueHeader'>
						<div className='MainCard__sectionTitle'>
							<span>3</span>
							<div><h2>Очередь печати</h2><p>{ListPrint.length ? `Добавлено: ${ListPrint.length}` : 'Добавленные пропуска появятся здесь'}</p></div>
						</div>
						<div className='MainCard--headerInfo--ListPrintCard--BTN'>
							<button className='MainCard--headerInfo--ListPrintCard--BTN--Clear' onClick={() => DeleteListCard()} id={theme} disabled={!ListPrint.length}>
								<span>{ICON.DeleteCard}</span>Очистить
							</button>
							<button className='MainCard--headerInfo--ListPrintCard--BTN--View' onClick={() => ListPrint.length > 0 ? setOpenModal(true) : warningListPrint()}>
								<span>{ICON.Doc}</span>Предпросмотр и печать
							</button>
						</div>
					</div>
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
									{ListPrint.length === 0 && <tr className='MainCard__emptyRow'><td colSpan={5}>Очередь пока пуста — заполните форму и нажмите «Добавить»</td></tr>}
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
									deleteLineCard(data.Id)
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
				</div>
			</div>
			<ModalWindows
				Title={'Предварительный просмотр'}
				size='xl'
				modalIsOpen={OpenModal}
				onClose={() => setOpenModal(false)}
			>
				<div className='Print'>
					{!printLayout.fits && <div className='Print_SizeWarning' role='alert'>
						Этот шаблон имеет размер {printLayout.itemWidthMm} × {printLayout.itemHeightMm} мм с учётом двух сторон удостоверения и не помещается в печатную область A4. Уменьшите размер шаблона в редакторе.
					</div>}
					<div className='Print--content'>
						<A4Sheet
							ref={printRef}
							ActivePrintVip={ActivePrintVip}
							NumberObject={NumberObjectPage}
						/>
					</div>
					<button className='Print_BTN' disabled={!printLayout.fits} onClick={() => { setPrintDialogClosed(false); handlePrint() }}>
						<span>{ICON.Print}</span>Печать
					</button>
					{PrintDialogClosed && <div className='PrintConfirm_Backdrop' role='dialog' aria-modal='true' aria-labelledby='photo-cleanup-title'>
						<div className='PrintConfirm'>
							<h2 id='photo-cleanup-title'>Удалить фотографии?</h2>
							<p>Печать завершена. Удалить временные фотографии сотрудников с сервера и очистить список печати?</p>
							<div className='PrintConfirm_Actions'>
								<button className='PrintConfirm_Keep' onClick={() => setPrintDialogClosed(false)}>Нет, оставить</button>
								<button className='PrintConfirm_Delete' onClick={finishPrintAndCleanup}>Да, удалить</button>
							</div>
						</div>
					</div>}
				</div>
			</ModalWindows>
		</Context.Provider>
	)
}
export default CardAll
