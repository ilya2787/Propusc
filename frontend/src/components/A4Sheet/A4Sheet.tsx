import { forwardRef, useContext } from 'react'
import { Context } from '../../Page/Card/CardAll'
import LayoutCardPass from '../LayoutCard/LayoutCardPass'
import LayoutCardPassVip from '../LayoutCard/LayoutCardPassVip'
import './StyleA4.scss'
import { formatDate } from '../FormatDate/FormatDate'

interface Props {
	ActivePrintVip: boolean
	NumberObject: number
}
export const A4Sheet = forwardRef<HTMLDivElement, Props>(
	({ ActivePrintVip, NumberObject }, ref) => {
		const AllContext = useContext(Context)
		const ListPrint = AllContext.ListPrint
		const SelectedTemplate = AllContext.SelectedTemplate
		const printLayout = SelectedTemplate.design.printLayout ?? 'horizontal'

		const chunkArray = <T,>(array: T[], size: number): T[][] => {
			const result: T[][] = []
			for (let i = 0; i < array.length; i += size) {
				result.push(array.slice(i, i + size))
			}
			return result
		}
		const pages = chunkArray(ListPrint, NumberObject)
		const printedDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
			? formatDate(value, SelectedTemplate.design.dateFormat)
			: value
		const renderDoublePass = (data: typeof ListPrint[number]) => <LayoutCardPassVip
			key={data.Id}
			Number_Tabs={data.Number_Tabs}
			CurrentSingleOrganization={data.Organization}
			CurrentSinglePost={data.Post}
			LastName={data.LastName}
			FirstName={data.FirstName}
			Patronymic={data.Patronymic}
			NewDate={printedDate(data.NewDate)}
			FilePhoto={data.FilePhoto}
			QrKey={data.QrKey}
			CustomFields={data.CustomFields}
			Print={true}
			template={SelectedTemplate}
		/>
		if (ActivePrintVip && printLayout === 'duplex') return <div ref={ref} className='print-wrapper'>
			{ListPrint.flatMap(data => [
				<div key={`${data.Id}-front`} className='a4-page_Vip a4-page_Vip--duplex duplex-front'>{renderDoublePass(data)}</div>,
				<div key={`${data.Id}-back`} className='a4-page_Vip a4-page_Vip--duplex duplex-back'>{renderDoublePass(data)}</div>,
			])}
		</div>
		return (
			<div ref={ref} className='print-wrapper'>
				{pages.map((page, index) =>
					!ActivePrintVip ? (
						<div key={index} className='a4-page'>
							{page.map(data => (
								<LayoutCardPass
									key={data.Id}
									Number_Tabs={data.Number_Tabs}
									CurrentSingleOrganization={data.Organization}
									CurrentSinglePost={data.Post}
									LastName={data.LastName}
									FirstName={data.FirstName}
									Patronymic={data.Patronymic}
									NewDate={printedDate(data.NewDate)}
									FilePhoto={data.FilePhoto}
									QrKey={data.QrKey}
									CustomFields={data.CustomFields}
									Print={true}
									template={SelectedTemplate}
								/>
							))}
						</div>
					) : (
						<div key={index} className={`a4-page_Vip ${printLayout === 'vertical' ? 'a4-page_Vip--vertical' : ''}`}>
							{page.map(data => (
								<LayoutCardPassVip
									key={data.Id}
									Number_Tabs={data.Number_Tabs}
									CurrentSingleOrganization={data.Organization}
									CurrentSinglePost={data.Post}
									LastName={data.LastName}
									FirstName={data.FirstName}
									Patronymic={data.Patronymic}
									NewDate={printedDate(data.NewDate)}
									FilePhoto={data.FilePhoto}
									QrKey={data.QrKey}
									CustomFields={data.CustomFields}
									Print={true}
									template={SelectedTemplate}
								/>
							))}
						</div>
					),
				)}
			</div>
		)
	},
)
