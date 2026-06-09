import { AiFillPrinter } from 'react-icons/ai'
import { BsPersonVcard } from 'react-icons/bs'
import { CgDarkMode } from 'react-icons/cg'
import { GoHome } from 'react-icons/go'
import { HiDocumentDuplicate } from 'react-icons/hi2'
import { IoCloseOutline, IoSettingsOutline } from 'react-icons/io5'
import {
	MdAssignmentAdd,
	MdMovieEdit,
	MdOutlineAddCard,
	MdOutlineDeleteSweep,
	MdOutlineDocumentScanner,
} from 'react-icons/md'
import { PiUploadThin } from 'react-icons/pi'
import { RxUpdate } from 'react-icons/rx'
import { TbPhotoUp } from 'react-icons/tb'
import { TiUserDelete } from 'react-icons/ti'

export const ICON = {
	Document: <HiDocumentDuplicate />,
	CardPass: <BsPersonVcard />,
	Home: <GoHome />,
	Editor: <MdMovieEdit />,
	Upload: <PiUploadThin />,
	AddCard: <MdOutlineAddCard />,
	DeleteCard: <TiUserDelete />,
	DeleteUser: <MdOutlineDeleteSweep />,
	Photo: <TbPhotoUp />,
	Exit: <IoCloseOutline />,
	Doc: <MdOutlineDocumentScanner />,
	Print: <AiFillPrinter />,
	Revers: <RxUpdate />,
	AddList: <MdAssignmentAdd />,
	Setting: <IoSettingsOutline />,
	DarkMode: <CgDarkMode />,
}
