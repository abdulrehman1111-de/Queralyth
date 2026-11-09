import React from 'react'

const Sidebuttons = ({content, icon: Icon}) => {
  return (
    <div className='w-full h-auto lg:p-1 flex items-center lg:gap-3 cursor-pointer hover:bg-white/10 transition-colors duration-100 hover:bg-white/10 rounded-lg'>
      <Icon className="lg:w-5 lg:h-5 font-semibold shrink-0"/>  
      <p className='text-white lg:text-lg'>{content}</p>
    </div>
  )
}

export default Sidebuttons
