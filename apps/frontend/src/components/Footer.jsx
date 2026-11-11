import React from 'react'
import {
  Database,
  Server,
  Sun,
  Search,
} from "lucide-react";

const Footer = () => {
  return (
    <div className='w-full h-auto lg:p-1.5 border border-gray-700 flex justify-between items-center'>

        <div className='flex gap-1'>
            <Database className="lg:w-4 lg:h-4 shrink-0 text-gray-500
            " />
            <p className='text-xs text-white/60'>Production DB</p>
        </div>
        <div className='flex gap-1'>
            <Server className="lg:w-4 lg:h-4 shrink-0 text-gray-500
            " />
            <p className='text-xs text-white/60'>MySQL 8.0</p>
        </div>
      
    </div>
  )
}

export default Footer
