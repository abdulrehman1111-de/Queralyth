import React from "react";
import {
  Database,
  Sun,
  Search,
} from "lucide-react";

const TitleBar = () => {
  return (
    <div className="w-full h-auto lg:p-3 border border-ql-line flex justify-between items-center">
      <div className="flex lg:gap-2 items-center">
        <Database className="lg:w-5 lg:h-5 shrink-0 text-ql-blue" />
        <p className="font-semibold text-lg text-ql-fg">Queralyth</p>
      </div>

      <div>
        <label
          htmlFor="searchBar"
          className="flex items-center border border-ql-line rounded-lg w-160 h-auto p-2 bg-ql-panel gap-2 focus-within:border-ql-blue"
        >
          <Search className="lg:w-4 lg:h-4 shrink-0 text-ql-fg-secondary" />
          <input
            className="bg-transparent w-full outline-none border-none"
            type="text"
            name="searchBar"
            id="searchBar"
            placeholder="Search queries, connections..."
          />
          <kbd className="text-nowrap border border-ql-line rounded-md px-2 py-0.5">
            Ctrl + K
          </kbd>
        </label>
      </div>

      <div className="flex lg:gap-3 items-center">
        <Sun className="lg:w-5 lg:h-5 shrink-0 text-ql-fg-secondary" />
        <div className="w-7 h-7 bg-ql-avatar rounded-full flex justify-center items-center">
          <p className="font-semibold">U</p>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
