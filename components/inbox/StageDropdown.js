"use client";

import { useState, useEffect, useRef } from "react";

export default function StageDropdown({
  centralInboxId,
  selectedStage,
  onStageChange,
}) {
  const [stages, setStages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (centralInboxId) {
      fetchStages();
    }
  }, [centralInboxId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchStages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/central-inboxes/${centralInboxId}/stages`);
      if (res.ok) {
        const data = await res.json();
        setStages(data);
      }
    } catch (error) {
      console.error("Failed to fetch stages:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectStage = (stage) => {
    onStageChange?.(stage);
    setIsOpen(false);
  };

  const selectedStageId = selectedStage?._id || selectedStage?.id;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Stage Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 border border-base-300 rounded-lg hover:border-base-content/30 transition-colors text-sm"
      >
        {selectedStage ? (
          <>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: selectedStage.color }}
            />
            <span>{selectedStage.name}</span>
          </>
        ) : (
          <span className="text-base-content/50">No stage</span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-base-100 border border-base-300 rounded-lg shadow-lg">
          <div className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <div className="flex justify-center p-2">
                <span className="loading loading-spinner loading-sm"></span>
              </div>
            ) : stages.length === 0 ? (
              <p className="text-sm text-base-content/50 p-2 text-center">
                No stages
              </p>
            ) : (
              <>
                {/* Clear option */}
                <button
                  onClick={() => selectStage(null)}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-base-300" />
                  <span className="text-sm text-base-content/50">
                    No stage
                  </span>
                </button>

                {stages.map((stage) => {
                  const stageId = stage._id || stage.id;
                  const isSelected = selectedStageId === stageId;

                  return (
                    <button
                      key={stageId}
                      onClick={() => selectStage(stage)}
                      className={`w-full flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors ${
                        isSelected ? "bg-base-200" : ""
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="flex-1 text-left text-sm">
                        {stage.name}
                      </span>
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-4 h-4 text-primary"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
