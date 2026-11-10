
import React from 'react'

const Sidebuttons = ({content, icon: Icon}) => {
  return (
    <div className='w-full h-auto lg:p-1 flex items-center lg:gap-3 cursor-pointer hover:bg-ql-hover transition-colors duration-100 rounded-lg'>
      <Icon className="lg:w-5 lg:h-5 font-semibold shrink-0 text-ql-fg-secondary"/>  
      <p className='text-ql-fg-secondary lg:text-lg'>{content}</p>
    </div>
  )
}

export default Sidebuttons
