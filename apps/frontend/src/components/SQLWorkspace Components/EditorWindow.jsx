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

    const newTab = {
        tabId: counterIdRef.current + 1,
        title: "Query " + String(tabs.length + 1),
        sqlQuery: ""
    }
    counterIdRef.current++  

    setTabs((previousTabs)=>{
      return [...previousTabs, newTab]
    })

    setActiveTabID(newTab.tabId)    
  }

  const deleteTab = (tabId)=>{
    if(tabs.length > 1){
      const updatedTabsList = tabs.filter((tab)=>{
        return tab.tabId !== tabId
      })

      const renamedTabsList = updatedTabsList.map((tab, index)=>{
        return {
          ...tab,
          title: `Query ${index + 1}`
        }
      })

      const deletedTabIndex = tabs.findIndex((tab)=>{
        return tab.tabId === tabId
      })
      const deletedTabPosition = deletedTabIndex + 1

      if(tabId === activeTabId){
        if(deletedTabPosition === 2){
          setActiveTabID(updatedTabsList[0].tabId)
        }
        else if(deletedTabPosition === tabs.length){
          setActiveTabID(updatedTabsList[updatedTabsList.length - 1].tabId)
        }
        else{
          setActiveTabID(updatedTabsList[updatedTabsList.length - 1].tabId)
        }
      }
      setTabs(renamedTabsList)
    }
  }

  
  return (
    <div className="w-full min-h-[60vh] bg-ql-code rounded-lg border border-ql-line flex flex-col overflow-hidden">
      <EditorTabs addNewTab={addNewTab} tabs={tabs} activeTabId={activeTabId} setActiveTabID={setActiveTabID} deleteTab={deleteTab} />
      <EditorToolbar />

      <CodeEditor activeTabData={activeTabData} updateActiveTabQuery={updateActiveTabQuery} />
      
    </div>
  );
};

export default EditorWindow;
