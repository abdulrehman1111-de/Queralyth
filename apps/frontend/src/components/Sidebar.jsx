import React from "react";
import {
  Database,
  Terminal,
  History,
  Network,
  ChartNoAxesColumnIncreasing,
  BrainCircuit,
  Settings,
  ChevronDown,
} from "lucide-react";
import Sidebuttons from "./Sidebuttons";

const Sidebar = () => {
  return (
    <aside className="border border-white min-h-screen lg:w-[236px] lg:shrink-0">
      <div className="border border-white w-full h-auto lg:p-5 lg:flex lg:gap-3 items-center">
        <Database className="lg:w-8 lg:h-8 shrink-0 text-(--color-ql-success)"/>
        <p className="text-3xl font-semibold text-(--color-ql-success)">Queralyth</p>
      </div>

      <div className="w-full border border-white h-auto lg:p-5 flex flex-col">
          <Sidebuttons content={"SQL Workspace"} icon={Terminal}/>
          <Sidebuttons content={"Query History"} icon={History}/>
          <Sidebuttons content={"Connections"} icon={Network}/>
          <Sidebuttons content={"Performance"} icon={ChartNoAxesColumnIncreasing}/>
          <Sidebuttons content={"Insights"} icon={BrainCircuit}/>
          <Sidebuttons content={"Settings"} icon={Settings}/>
      </div>
    </aside>
  );
};

export default Sidebar;
