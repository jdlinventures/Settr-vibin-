"use client";

import { useState } from "react";

export default function BulkActionBar({
  centralInboxId,
  selectedCount,
  selectedEmailIds,
  onClear,
  onActionComplete,
}) {
  const [loading, setLoading] = useState(false);

  const performAction = async (action, value = null) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/inbox/${centralInboxId}/emails/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailIds: selectedEmailIds,
            action,
            value,
          }),
        }
      );

      if (res.ok) {
        onActionComplete?.();
      } else {
        const data = await res.json();
        console.error("Bulk action failed:", data.error);
      }
    } catch (err) {
      console.error("Bulk action error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[slideUp_200ms_ease-out]">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#171717] text-white rounded-xl shadow-2xl">
        {/* Count */}
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedCount} selected
        </span>

        <div className="w-px h-5 bg-white/20" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => performAction("archive")}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            title="Archive"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Archive
          </button>

          <button
            onClick={() => performAction("markRead")}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            title="Mark as Read"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
            </svg>
            Read
          </button>

          <button
            onClick={() => performAction("markUnread")}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            title="Mark as Unread"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Unread
          </button>

          <button
            onClick={() => performAction("delete")}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-red-500/20 text-red-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete
          </button>
        </div>

        <div className="w-px h-5 bg-white/20" />

        {/* Clear */}
        <button
          onClick={onClear}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Clear selection"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading && (
          <span className="loading loading-spinner loading-xs"></span>
        )}
      </div>
    </div>
  );
}
