import React, { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const categories = [
  {
    name: "All",
    color: "bg-blue-500 hover:bg-blue-600",
    selectedColor: "bg-blue-600",
  },
  {
    name: "Mann Ki Baat",
    color: "bg-purple-600 hover:bg-purple-700",
    selectedColor: "bg-purple-800",
    isOfficial: true,
    category: "mann-ki-baat",
  },
  {
    name: "Op Ed",
    color: "bg-indigo-600 hover:bg-indigo-700",
    selectedColor: "bg-indigo-800",
    isOfficial: true,
    category: "op-ed",
  },
  {
    name: "ISF Updates",
    color: "bg-teal-600 hover:bg-teal-700",
    selectedColor: "bg-teal-800",
    isOfficial: true,
    category: "isf-updates",
  },
  {
    name: "Medical",
    color: "bg-green-500 hover:bg-green-600",
    selectedColor: "bg-green-700",
  },
  {
    name: "Life Skills",
    color: "bg-green-500 hover:bg-green-600",
    selectedColor: "bg-green-700",
  },
  {
    name: "Spoken Eng",
    color: "bg-green-500 hover:bg-green-600",
    selectedColor: "bg-green-700",
  },
  {
    name: "Comp Apps",
    color: "bg-orange-500 hover:bg-orange-600",
    selectedColor: "bg-orange-700",
  },
  {
    name: "Art Therapy",
    color: "bg-green-500 hover:bg-green-600",
    selectedColor: "bg-green-700",
  },
  {
    name: "Sports",
    color: "bg-red-500 hover:bg-red-600",
    selectedColor: "bg-red-700",
  },
  {
    name: "Technology",
    color: "bg-blue-600 hover:bg-blue-700",
    selectedColor: "bg-blue-800",
  },
];

const CategoryButtons = ({
  onCategoryChange,
  selectedCategory = "All",
  hiddenNames = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCategoryClick = (category) => {
    onCategoryChange(category);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="w-full">
      {/* Header with toggle button */}
      <div className="category-header">
        <h3>Categories</h3>
        <button
          onClick={toggleExpanded}
          className="category-toggle-button"
          title={isExpanded ? "Collapse categories" : "Expand categories"}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 transition-transform duration-200" />
          ) : (
            <ChevronDown className="w-5 h-5 transition-transform duration-200" />
          )}
        </button>
      </div>

      {/* Collapsible category buttons container with smooth animation */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="category-buttons-container flex gap-2 flex-wrap pb-2 px-4">
          {categories
            .filter((category) => !hiddenNames.includes(category.name))
            .map((category) => {
              const isSelected = selectedCategory === category.name;
              const buttonColor = isSelected
                ? category.selectedColor
                : category.color;

              return (
                <button
                  key={category.name}
                  onClick={() => handleCategoryClick(category)}
                  className={`${buttonColor} text-white px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap min-w-fit border-0 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-500 flex-shrink-0 relative`}
                  style={{ height: "40px", minWidth: "100px" }}
                >
                  {category.name}
                  {category.isOfficial && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white"></div>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default CategoryButtons;
