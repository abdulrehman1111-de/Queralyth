import CodeEditor from "./CodeEditor";
import EditorTabs from "./EditorTabs";
import EditorToolbar from "./EditorToolbar";
import { useRef, useState } from "react";

const EditorWindow = () => {

  const [tabs, setTabs] = useState([{
    tabId: 1,
    title: "Query 1",
    sqlQuery: ""
  }])

  const [activeTabId, setActiveTabID] = useState(1)
  const counterIdRef = useRef(1)
  
  const activeTabData = tabs.find((tab)=>{
    return tab.tabId === activeTabId
  })

  const updateActiveTabQuery = (newSqlQuery)=>{
    setTabs((previousTabs)=>{
      return previousTabs.map((tab)=>{
        if(tab.tabId === activeTabId){
          if(tab.sqlQuery !== newSqlQuery){
            return {
              ...tab, 
              sqlQuery: newSqlQuery
            }
          }
          else{
            return tab
          }
        }
        else{
          return tab
        }
      })
    })
  }

  const addNewTab = ()=>{
    let newTab
    setTabs((previousTabs)=>{
      newTab = {
        tabId: counterIdRef.current + 1,
        title: "Query " + String(counterIdRef.current + 1),
        sqlQuery: ""
      }
      return [...previousTabs, newTab]
    })

    setActiveTabID(newTab.tabId)
    counterIdRef.current++
  }

  
  return (
    <div className="w-full min-h-[60vh] bg-ql-code rounded-lg border border-ql-line flex flex-col overflow-hidden">
      <EditorTabs addNewTab={addNewTab} />
      <EditorToolbar />

      <CodeEditor activeTabData={activeTabData} updateActiveTabQuery={updateActiveTabQuery} />
      
    </div>
  );
};

export default EditorWindow;
