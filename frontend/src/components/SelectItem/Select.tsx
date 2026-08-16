import { type Dispatch, type FC, type SetStateAction } from 'react'
import Select, { type SingleValue } from 'react-select'
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
	const getSingle = () => {
		return CurrentSingle ? option.find(c => c.value === CurrentSingle) : ''
	}

	const onChangeSingle = (newValue: SingleValue<string | IOption>) => {
		if (setCurrentSingle && newValue) setCurrentSingle((newValue as IOption).value)
	}

	return (
		<Select
			className='custom-select'
			classNamePrefix='custom-select'
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
