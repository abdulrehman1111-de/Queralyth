import React from 'react'
import {Database, Wand2, BarChart, Play, Maximize2 } from "lucide-react";
import QueryButtons from "./QueryButtons";

const EditorToolbar = () => {
  return (
    <div className="bg-ql-panel w-full border border-ql-line h-[14%] flex items-center justify-between">

        <div className="flex gap-5 items-center p-3 px-5 h-full">
          <QueryButtons icon={Database} content={"Production DB"} />
          <div className="h-6 w-px shrink-0 bg-ql-line" />
          <QueryButtons icon={Wand2} content={"Format"} />
          <div className="h-6 w-px shrink-0 bg-ql-line" />
          <QueryButtons icon={BarChart} content={"Explain"} />
        </div>

        <div className="flex gap-3 items-center p-3 px-5.5 h-full">
            <button className="flex justify-center items-center gap-2 bg-ql-button/80 hover:bg-ql-button py-1.5 px-4 rounded-lg">
              <Play className="w-4 h-4 fill-current text-white" />
              <p className="font-semibold text-white">Run Query</p>
            </button>

            <kbd className="text-nowrap border border-ql-line rounded-md px-2 py-0.5 text-white/50">
            Ctrl + Enter
            </kbd>

            <Maximize2 className="w-4 h-4 hover:text-white text-white/50" />
        </div>

      </div>
  )
}

export default EditorToolbar
