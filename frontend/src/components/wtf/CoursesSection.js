import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const courseItems = [
  { name: "Minimouse", active: false },
  { name: "Dance Mat Typing", active: true },
  { name: "Simple Maths", active: false },
  { name: "Early Maths", active: false },
  { name: "Brain Games", active: false },
  { name: "Puzzle", active: false },
  { name: "Scratch", active: false },
  { name: "Canva", active: false },
  { name: "Toony Tools", active: false },
];

const CoursesSection = ({ isCollapsed = false }) => {
  const [isCoursesOpen, setIsCoursesOpen] = useState(true);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4">
        <button
          onClick={() => setIsCoursesOpen(!isCoursesOpen)}
          className={`bg-green-500 text-white ${isCollapsed ? 'px-2 py-2' : 'px-8 py-4'} rounded-3xl w-full flex items-center justify-center font-bold ${isCollapsed ? 'text-sm' : 'text-lg'} hover:bg-green-600 transition-colors shadow-md`}
        >
          {isCollapsed ? "📚" : "Courses"}
        </button>
      </div>

      {isCoursesOpen && !isCollapsed && (
        <div className="px-4 pb-4 space-y-3">
          {courseItems.map((item) => (
            <button
              key={item.name}
              className={`w-full text-left px-6 py-3 rounded-3xl transition-colors flex items-center justify-between font-medium text-gray-700 shadow-sm ${
                item.active
                  ? "bg-purple-300 text-purple-800"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {item.name}
              <ChevronDown className="w-5 h-5" />
            </button>
          ))}
        </div>
      )}

      {isCollapsed && (
        <div className="px-2 pb-4 space-y-2">
          {courseItems.slice(0, 3).map((item, index) => (
            <button
              key={item.name}
              className={`w-full p-2 rounded-full transition-colors font-medium text-xs shadow-sm ${
                item.active
                  ? "bg-purple-300 text-purple-800"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              title={item.name}
            >
              {index === 0 ? "🖱️" : index === 1 ? "💃" : "🔢"}
            </button>
          ))}
          <div className="text-center text-xs text-gray-500 mt-2">+{courseItems.length - 3}</div>
        </div>
      )}
    </div>
  );
};

export default CoursesSection;
