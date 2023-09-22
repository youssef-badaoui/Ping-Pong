'use client';
import SideBar from '@/components/LoggedUser/SideBar/SideBar'
import React from 'react'

export default function Chat() {

	const [isExpanded, setIsExpanded] = React.useState<boolean>(false);

  return (
	<div className="logged-user">
		<SideBar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
		<div className={`chat ${isExpanded ? 'ml-16': ''}`}>
			<h2 className='text-2xl bg-slate-400 text-white mx-auto my-4 text-center uppercase'>
				This is the chat page
			</h2>
		</div>
	</div>
  )
}
