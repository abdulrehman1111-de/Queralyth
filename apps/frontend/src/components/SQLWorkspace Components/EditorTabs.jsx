import { FileCode } from "lucide-react";
import { X } from "lucide-react";

const EditorTabs = ({
  addNewTab,
  tabs,
  activeTabId,
  setActiveTabID,
  deleteTab,
}) => {
  return (
    <div className="bg-ql-head editor-tabs-scroll w-full h-[11%] flex items-center border border-ql-line rounded-tl-lg overflow-x-auto">
      {tabs.map((tab) => {
        return (
          <div
            onClick={() => setActiveTabID(tab.tabId)}
            key={tab.tabId}
            className={`w-35 h-full rounded-tl-lg flex gap-3.5 justify-center items-center border border-ql-code shrink-0
              ${tab.tabId === activeTabId ? "bg-ql-panel rounded-tl-lg hover:bg-ql-panel/70" : "bg-ql-head hover:bg-ql-head/70"}
            `}
          >
            <div className="flex gap-2 justify-center items-center">
              <FileCode className="w-4 h-4 text-ql-blue" />
              <p className="text-sm">{tab.title}</p>
            </div>
            {tabs.length > 1 ? (
              <X
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTab(tab.tabId);
                }}
                className="w-4.5 h-4.5 pl-1 shrink-0"
              />
            ) : (
              ""
            )}
          </div>
        );
      })}

      <button
        onClick={() => addNewTab()}
        className="hover:bg-white/3 w-11 h-full"
      >
        <p className="text-xl">+</p>
      </button>
    </div>
  );
};

export default EditorTabs;
