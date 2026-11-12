import React from "react";
import EditorTabs from "./EditorTabs";
import EditorToolbar from "./EditorToolbar";

const EditorWindow = () => {
  return (
    <div className="w-full h-[60vh] bg-ql-code rounded-lg border border-ql-line">
      <EditorTabs/>
      <EditorToolbar/>
      
    </div>
  );
};

export default EditorWindow;
