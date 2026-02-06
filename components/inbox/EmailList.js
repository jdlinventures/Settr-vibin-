"use client";

import { useState, useEffect, useCallback } from "react";
import EmailListItem from "./EmailListItem";

export default function EmailList({
  centralInboxId,
  selectedThreadId,
  onSelectThread,
  filter,
  activeFilters = {},
  refreshKey,
  searchQuery = "",
  onEmailsLoaded,
  selectedIndex = 0,
  selectedEmails = new Set(),
  onToggleEmailSelection,
}) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchEmails = useCallback(
    async (cursor = null) => {
      if (!centralInboxId) return;

      try {
        if (cursor) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams();
        if (cursor) params.set("cursor", cursor);
        if (filter) params.set("filter", filter);
        if (activeFilters.stageId) params.set("stage", activeFilters.stageId);
        if (activeFilters.tags?.length > 0) {
          activeFilters.tags.forEach((tagId) => params.append("tag", tagId));
        }
        if (searchQuery) params.set("search", searchQuery);

        const res = await fetch(
          `/api/inbox/${centralInboxId}/emails?${params.toString()}`
        );

        if (res.ok) {
          const data = await res.json();

          if (cursor) {
            setEmails((prev) => {
              const updatedEmails = [...prev, ...data.emails];
              onEmailsLoaded?.(updatedEmails);
              return updatedEmails;
            });
          } else {
            setEmails(data.emails);
            onEmailsLoaded?.(data.emails);
          }

          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
        }
      } catch (error) {
        console.error("Failed to fetch emails:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [centralInboxId, filter, activeFilters.stageId, activeFilters.tags, searchQuery]
  );

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails, refreshKey]);

  const loadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchEmails(nextCursor);
    }
  };

  // Handle scroll to load more
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loadingMore) {
      loadMore();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
          className="w-16 h-16 mb-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z"
          />
        </svg>
        <p className="text-base font-medium text-neutral-500">No emails yet</p>
        <p className="text-sm mt-1">
          Connect an email account and assign it to this inbox
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" onScroll={handleScroll}>
      {emails.map((email, index) => {
        const emailId = email._id || email.id;
        return (
          <EmailListItem
            key={emailId}
            email={email}
            isSelected={selectedThreadId === email.threadId}
            isKeyboardSelected={index === selectedIndex}
            onClick={() => onSelectThread(email.threadId, email)}
            showCheckbox={selectedEmails.size > 0}
            isChecked={selectedEmails.has(emailId)}
            onCheckChange={() => onToggleEmailSelection?.(emailId)}
          />
        );
      })}

      {loadingMore && (
        <div className="flex justify-center p-4">
          <span className="loading loading-spinner loading-sm"></span>
        </div>
      )}

      {hasMore && !loadingMore && (
        <button onClick={loadMore} className="w-full py-3 text-xs font-medium text-neutral-500 hover:bg-[#f5f5f5] transition-colors">
          Load more
        </button>
      )}
    </div>
  );
}
