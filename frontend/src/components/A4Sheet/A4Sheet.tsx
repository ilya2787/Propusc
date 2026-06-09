import { forwardRef, useContext } from 'react'
import { Context } from '../../Page/Card/CardAll'
import LayoutCardPass from '../LayoutCard/LayoutCardPass'
import LayoutCardPassVip from '../LayoutCard/LayoutCardPassVip'
import './StyleA4.scss'

interface Props {
	ActivePrintVip: boolean
	NumberObject: number
}
export const A4Sheet = forwardRef<HTMLDivElement, Props>(
	({ ActivePrintVip, NumberObject }, ref) => {
		const AllContext = useContext(Context)
		const ListPrint = AllContext.ListPrint

		const chunkArray = <T,>(array: T[], size: number): T[][] => {
			const result: T[][] = []
			for (let i = 0; i < array.length; i += size) {
				result.push(array.slice(i, i + size))
			}
			return result
		}
		const pages = chunkArray(ListPrint, NumberObject)
		return (
			<div ref={ref} className='print-wrapper'>
				{pages.map((page, index) =>
					!ActivePrintVip ? (
						<div key={index} className='a4-page'>
							{page.map(data => (
								<LayoutCardPass
									key={data.Number_Tabs}
									Number_Tabs={data.Number_Tabs}
									CurrentSingleOrganization={data.Organization}
									CurrentSinglePost={data.Post}
									LastName={data.LastName}
									FirstName={data.FirstName}
									Patronymic={data.Patronymic}
									NewDate={data.NewDate}
									FilePhoto={data.FilePhoto}
									Print={true}
								/>
							))}
						</div>
					) : (
						<div key={index} className='a4-page_Vip'>
							{page.map(data => (
								<LayoutCardPassVip
									key={data.Number_Tabs}
									Number_Tabs={data.Number_Tabs}
									CurrentSingleOrganization={data.Organization}
									CurrentSinglePost={data.Post}
									LastName={data.LastName}
									FirstName={data.FirstName}
									Patronymic={data.Patronymic}
									NewDate={data.NewDate}
									FilePhoto={data.FilePhoto}
									Print={true}
								/>
							))}
						</div>
					),
				)}
			</div>
		)
	},
)
