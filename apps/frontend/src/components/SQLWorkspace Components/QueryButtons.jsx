import React from "react";
import { ChevronDown } from "lucide-react";

const QueryButtons = ({icon: Icon, content}) => {
  return (
    <div className="flex gap-2 items-center">
      <Icon className="w-4 h-4 text-white/50" />
      <p>{content}</p>
      <ChevronDown className="w-4 h-4 text-white/50" />
    </div>
  );
};

export default QueryButtons;
