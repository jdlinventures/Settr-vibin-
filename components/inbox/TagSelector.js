"use client";

import { useState, useEffect, useRef } from "react";
import TagBadge from "./TagBadge";

export default function TagSelector({
  centralInboxId,
  selectedTags = [],
  onTagsChange,
}) {
  const [tags, setTags] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (centralInboxId) {
      fetchTags();
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

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/central-inboxes/${centralInboxId}/tags`);
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim() || creating) return;

    setCreating(true);
    try {
      const res = await fetch(`/api/central-inboxes/${centralInboxId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (res.ok) {
        const newTag = await res.json();
        setTags([...tags, newTag]);
        setNewTagName("");
        // Auto-select the new tag
        onTagsChange?.([...selectedTags, newTag]);
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      setCreating(false);
    }
  };

  const toggleTag = (tag) => {
    const tagId = tag._id || tag.id;
    const isSelected = selectedTags.some((t) => (t._id || t.id) === tagId);

    if (isSelected) {
      onTagsChange?.(selectedTags.filter((t) => (t._id || t.id) !== tagId));
    } else {
      onTagsChange?.([...selectedTags, tag]);
    }
  };

  const removeTag = (tag) => {
    const tagId = tag._id || tag.id;
    onTagsChange?.(selectedTags.filter((t) => (t._id || t.id) !== tagId));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Tags Display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-wrap items-center gap-1 min-h-[32px] p-1 border border-[#e5e5e5] rounded-lg cursor-pointer hover:border-neutral-400 transition-colors"
      >
        {selectedTags.length > 0 ? (
          selectedTags.map((tag) => (
            <TagBadge
              key={tag._id || tag.id}
              tag={tag}
              size="xs"
              onRemove={removeTag}
            />
          ))
        ) : (
          <span className="text-sm text-neutral-400 px-2">Add tags...</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-56 bg-white border border-[#e5e5e5] rounded-lg shadow-lg animate-[fadeIn_150ms_ease-out]">
          {/* Create New Tag */}
          <form onSubmit={createTag} className="p-2 border-b border-[#e5e5e5]">
            <div className="flex gap-1">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag..."
                className="flex-1 px-2.5 py-1.5 bg-[#f5f5f5] border-0 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300"
              />
              <button
                type="submit"
                disabled={!newTagName.trim() || creating}
                className="px-2.5 py-1.5 bg-[#171717] text-white rounded-md text-sm font-medium hover:bg-[#262626] disabled:opacity-30 transition-colors"
              >
                {creating ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  "+"
                )}
              </button>
            </div>
          </form>

          {/* Tag List */}
          <div className="max-h-48 overflow-y-auto p-1">
            {loading ? (
              <div className="flex justify-center p-2">
                <span className="loading loading-spinner loading-sm"></span>
              </div>
            ) : tags.length === 0 ? (
              <p className="text-sm text-neutral-400 p-2 text-center">
                No tags yet
              </p>
            ) : (
              tags.map((tag) => {
                const tagId = tag._id || tag.id;
                const isSelected = selectedTags.some(
                  (t) => (t._id || t.id) === tagId
                );

                return (
                  <button
                    key={tagId}
                    onClick={() => toggleTag(tag)}
                    className={`w-full flex items-center gap-2 p-2 rounded-md hover:bg-[#f5f5f5] transition-colors ${
                      isSelected ? "bg-[#f5f5f5]" : ""
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 text-left text-sm">{tag.name}</span>
                    {isSelected && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4 text-[#171717]"
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
