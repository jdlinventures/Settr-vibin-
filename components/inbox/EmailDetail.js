"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import TagSelector from "./TagSelector";
import StageDropdown from "./StageDropdown";
import TagBadge from "./TagBadge";

export default function EmailDetail({ centralInboxId, threadId, onClose, onThreadUpdate }) {
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedEmails, setExpandedEmails] = useState(new Set());
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (threadId) {
      fetchThread();
    }
  }, [threadId]);

  const fetchThread = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/inbox/${centralInboxId}/threads/${threadId}`
      );
      if (res.ok) {
        const data = await res.json();
        setThread(data);

        // Mark thread as read
        await fetch(`/api/inbox/${centralInboxId}/threads/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });

        // Expand the last email by default
        if (data.emails.length > 0) {
          const lastEmail = data.emails[data.emails.length - 1];
          setExpandedEmails(new Set([lastEmail._id || lastEmail.id]));
        }
      }
    } catch (error) {
      console.error("Failed to fetch thread:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmail = (emailId) => {
    setExpandedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  const handleArchive = async () => {
    try {
      await fetch(`/api/inbox/${centralInboxId}/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });
      onThreadUpdate?.();
      onClose?.();
    } catch (error) {
      console.error("Failed to archive:", error);
    }
  };

  const handleTagsChange = async (newTags) => {
    setUpdating(true);
    try {
      const tagIds = newTags.map((t) => t._id || t.id);
      const res = await fetch(`/api/inbox/${centralInboxId}/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: tagIds }),
      });
      if (res.ok) {
        setThread((prev) => ({ ...prev, tags: newTags }));
        onThreadUpdate?.();
      }
    } catch (error) {
      console.error("Failed to update tags:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleStageChange = async (newStage) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/inbox/${centralInboxId}/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: newStage?._id || newStage?.id || null }),
      });
      if (res.ok) {
        setThread((prev) => ({ ...prev, stage: newStage }));
        onThreadUpdate?.();
      }
    } catch (error) {
      console.error("Failed to update stage:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (!threadId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-base-content/50">
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
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
        <p>Select an email to view</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-full text-error">
        Failed to load email
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold truncate flex-1">
            {thread.subject || "(No Subject)"}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleArchive}
              className="btn btn-ghost btn-sm"
              title="Archive"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-sm lg:hidden">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tags and Stage */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/50 uppercase tracking-wide">Stage:</span>
            <StageDropdown
              centralInboxId={centralInboxId}
              selectedStage={thread.stage}
              onStageChange={handleStageChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-base-content/50 uppercase tracking-wide">Tags:</span>
              <div className="flex-1">
                <TagSelector
                  centralInboxId={centralInboxId}
                  selectedTags={thread.tags || []}
                  onTagsChange={handleTagsChange}
                />
              </div>
            </div>
          </div>
          {updating && (
            <span className="loading loading-spinner loading-xs"></span>
          )}
        </div>
      </div>

      {/* Email Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {thread.emails.map((email, index) => {
          const emailId = email._id || email.id;
          const isExpanded = expandedEmails.has(emailId);
          const isLast = index === thread.emails.length - 1;

          return (
            <div
              key={emailId}
              className="border border-base-300 rounded-lg overflow-hidden"
            >
              {/* Email Header - Always Visible */}
              <div
                onClick={() => toggleEmail(emailId)}
                className="p-4 bg-base-200 cursor-pointer hover:bg-base-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-full w-10">
                        <span className="text-sm">
                          {(email.from?.name || email.from?.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Sender Info */}
                    <div>
                      <div className="font-medium">
                        {email.isSent ? (
                          <span className="text-base-content/70">
                            You to {email.to?.[0]?.email || "Unknown"}
                          </span>
                        ) : (
                          email.from?.name || email.from?.email || "Unknown"
                        )}
                      </div>
                      <div className="text-xs text-base-content/50">
                        {format(new Date(email.receivedAt), "MMM d, yyyy h:mm a")}
                      </div>
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className={`w-5 h-5 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </div>

                {/* Preview when collapsed */}
                {!isExpanded && (
                  <p className="text-sm text-base-content/60 mt-2 truncate">
                    {email.bodyText?.slice(0, 150) || "(No content)"}
                  </p>
                )}
              </div>

              {/* Email Body - Expanded */}
              {isExpanded && (
                <div className="p-4 bg-base-100">
                  {/* To/CC */}
                  <div className="text-sm text-base-content/60 mb-4">
                    <div>
                      To: {email.to?.map((t) => t.email).join(", ") || "Unknown"}
                    </div>
                    {email.cc?.length > 0 && (
                      <div>CC: {email.cc.map((c) => c.email).join(", ")}</div>
                    )}
                  </div>

                  {/* Body */}
                  {email.bodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">
                      {email.bodyText || "(No content)"}
                    </div>
                  )}

                  {/* Attachments */}
                  {email.attachments?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-base-300">
                      <div className="text-sm font-medium mb-2">
                        Attachments ({email.attachments.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {email.attachments.map((att, i) => (
                          <div
                            key={i}
                            className="badge badge-outline gap-1 py-3"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                              />
                            </svg>
                            {att.filename}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply Box Placeholder */}
      <div className="p-4 border-t border-base-300">
        <button className="btn btn-primary btn-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
            />
          </svg>
          Reply
        </button>
      </div>
    </div>
  );
}
