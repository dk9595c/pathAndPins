import React, { useState } from "react";
import Button from "../../components/Button/Button";
import Input from "../../components/Input/Input";
import "./SearchBar.css";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  expanded?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onFocus,
  onBlur,
  placeholder = "Search activities...",
  expanded = false,
}) => {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    onSearch(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery("");
    onBlur?.();
  };

  return (
    <div className={`search-bar ${expanded ? "expanded" : "collapsed"}`}>
      <img src="/magnifiingGlass.svg" alt="Search" className="search-icon" />

      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
      />

      {expanded && (
        <img
          src="/close.svg"
          alt="Search"
          className="close-button"
          onClick={handleClear}
        />
      )}
    </div>
  );
};

export default SearchBar;
