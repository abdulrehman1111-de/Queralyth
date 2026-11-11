import React from "react";
import {
  Database,
  Sun,
  Search,
} from "lucide-react";

const StatusBar = () => {
  return (
    <div className="w-full h-auto lg:p-3 border border-gray-700 flex justify-between items-center">
      <div className="flex lg:gap-2 items-center">
        <Database className="lg:w-5 lg:h-5 shrink-0 text-ql-blue" />
        <p className="font-semibold text-lg text-white/90">Queralyth</p>
      </div>

      <div>
        <label
          htmlFor="searchBar"
          className="flex items-center border border-gray-700 rounded-lg w-160 h-auto p-2 bg-(--ql-panel) gap-2 focus-within:border-blue-500"
        >
          <Search className="lg:w-4 lg:h-4 shrink-0 text-gray-400" />
          <input
            className="bg-transparent w-full outline-none border-none"
            type="text"
            name="searchBar"
            id="searchBar"
            placeholder="Search queries, connections..."
          />
          <kbd className="text-nowrap border border-gray-700 rounded-md px-2 py-0.5">
            Ctrl + K
          </kbd>
        </label>
      </div>

      <div className="flex lg:gap-3 items-center">
        <Sun className="lg:w-5 lg:h-5 shrink-0 text-gray-400" />
        <div className="w-7 h-7 bg-gray-500 rounded-full flex justify-center items-center">
          <p className="font-semibold">U</p>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
