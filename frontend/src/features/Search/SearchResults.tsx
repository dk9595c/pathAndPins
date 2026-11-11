import React from "react";
import Card from "../../components/Card/Card";
import "./SearchResults.css";

import { z } from "zod";

export const SearchResultItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  duration: z.coerce.number(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  description: z.string().optional(),
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

interface SearchResultsProps {
  results: SearchResultItem[];
  onSelect: (item: SearchResultItem) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, onSelect }) => {
  if (results.length === 0) {
    return <p className="no-results">No results found.</p>;
  }

  return (
    <div className="search-results">
      {results.map((item) => (
        <div
          key={item.id}
          className="search-result-item"
          onClick={() => onSelect(item)}
        >
          <Card title={item.name} description={item.description} />
        </div>
      ))}
    </div>
  );
};

export default SearchResults;
