
import React from 'react'

const Sidebuttons = ({content, icon: Icon, isActive}) => {
  return (
    <div className='w-full h-auto lg:px-3 py-2 flex items-center lg:gap-2.5 cursor-pointer hover:bg-ql-hover transition-colors duration-100 rounded-lg'>
      <Icon className={`lg:w-4.5 lg:h-4.5 font-semibold shrink-0 ${isActive ? "text-white": "text-ql-fg-secondary"}`}/>  
      <p className={`lg:text-md ${isActive ? "text-white/90" : "text-ql-fg-secondary"}`}>{content}</p>
    </div>
  )
}

export default Sidebuttons
