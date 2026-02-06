"use client";

import { useState, useEffect, useRef } from "react";

export default function SearchInput({ onSearch, inputRef }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const internalRef = useRef(null);
  const ref = inputRef || internalRef;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Call onSearch when debounced query changes
  useEffect(() => {
    onSearch?.(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleClear = () => {
    setQuery("");
    ref.current?.focus();
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 text-neutral-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      <input
        ref={ref}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search emails..."
        className="w-full bg-[#f5f5f5] border-0 rounded-lg pl-9 pr-8 py-2 text-sm text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
