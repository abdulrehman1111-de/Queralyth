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
import { NavLink } from "react-router-dom";

const Sidebar = () => {

  return (
    <aside className="border border-ql-line bg-ql-panel min-h-[95.6vh] lg:w-[17%] lg:shrink-0 p-4 pt-5 flex flex-col gap-5">
      <div className="flex lg:gap-2 items-center">
        <Database className="lg:w-5 lg:h-5 shrink-0 text-ql-blue" />
        <p className="font-semibold text-lg text-white/90">Queralyth</p>
      </div>

      <div className="w-full h-auto flex flex-col gap-0.5">
        
        <NavLink
          to=""
          className={({ isActive }) =>
            `rounded-lg transition-colors ${
              isActive
                ? "bg-ql-hover text-white font-semibold"
                : "text-neutral-400 hover:text-white"
            }`
          }
        >
          <Sidebuttons isActive content={"SQL Workspace"} icon={Terminal} />
        </NavLink>
        
        <Sidebuttons content={"Query History"} icon={History} />
        <Sidebuttons content={"Connections"} icon={Network} />
        <Sidebuttons
          content={"Performance"}
          icon={ChartNoAxesColumnIncreasing}
        />
        <Sidebuttons content={"Insights"} icon={BrainCircuit} />
        <Sidebuttons content={"Settings"} icon={Settings} />
      </div>
    </aside>
  );
};

export default Sidebar;
