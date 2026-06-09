import { useContext, type Dispatch, type FC, type SetStateAction } from 'react'
import Select, { type SingleValue } from 'react-select'
import { AppContext } from '../../App'
import './StyleSelect.scss'
import type { IOption } from './TypeSelect'

interface TypeProps {
	Placeholder: string
	option: IOption[]
	CurrentSingle?: string
	setCurrentSingle?: Dispatch<SetStateAction<string>>
}
const SelectItem: FC<TypeProps> = ({
	Placeholder,
	option,
	CurrentSingle,
	setCurrentSingle,
}) => {
	const MainContext = useContext(AppContext)
	const theme = MainContext.theme
	const getSingle = () => {
		return CurrentSingle ? option.find(c => c.value === CurrentSingle) : ''
	}

	const onChangeSingle = (newValue: SingleValue<string | IOption>) => {
		setCurrentSingle && setCurrentSingle((newValue as IOption).value)
	}

	return (
		<Select
			classNamePrefix='custom-select'
			id={theme}
			onChange={onChangeSingle}
			value={getSingle()}
			options={option}
			isSearchable={true}
			placeholder={Placeholder}
			isMulti={false}
			noOptionsMessage={() => 'Нет в списке'}
		/>
	)
}

export default SelectItem
