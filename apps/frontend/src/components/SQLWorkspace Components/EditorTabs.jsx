import { FileCode } from 'lucide-react'

const EditorTabs = ({addNewTab}) => {

  return (
    <div className="bg-ql-head w-full h-[11%] flex items-center border border-ql-line rounded-tl-lg">
        <div className="w-[12%] h-full bg-ql-panel rounded-tl-lg flex gap-2 justify-center items-center">
          <FileCode className="w-4 h-4 text-ql-blue" />
          <p className="text-sm">Query 1</p>
        </div>
        <button onClick={()=> addNewTab} className='hover:bg-white/3 w-[4%] h-full'><p className="text-xl">+</p></button>
      </div>
  )
}

export default EditorTabs
