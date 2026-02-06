"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import TagSelector from "./TagSelector";
import StageDropdown from "./StageDropdown";
import TagBadge from "./TagBadge";
import ReplyComposer from "./ReplyComposer";

export default function EmailDetail({ centralInboxId, threadId, onClose, onThreadUpdate, triggerReply }) {
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedEmails, setExpandedEmails] = useState(new Set());
  const [updating, setUpdating] = useState(false);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replyMode, setReplyMode] = useState("reply"); // "reply" | "replyAll" | "forward"

  useEffect(() => {
    if (threadId) {
      fetchThread();
      setShowReplyComposer(false);
    }
  }, [threadId]);

  // Handle keyboard shortcut trigger for reply
  useEffect(() => {
    if (triggerReply && threadId && thread) {
      setReplyMode("reply");
      setShowReplyComposer(true);
    }
  }, [triggerReply]);

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

  const openReply = (mode) => {
    setReplyMode(mode);
    setShowReplyComposer(true);
  };

  // Build pre-fill data for different reply modes
  const getReplyData = () => {
    if (!thread || !thread.emails.length) return {};
    const lastEmail = thread.emails[thread.emails.length - 1];

    if (replyMode === "replyAll") {
      // Reply All: To = original sender, CC = all To + CC minus self
      const allRecipients = [...(lastEmail.to || []), ...(lastEmail.cc || [])];
      return {
        replyToEmail: lastEmail,
        prefillTo: lastEmail.from ? [lastEmail.from] : [],
        prefillCc: allRecipients,
        prefillSubject: lastEmail.subject?.startsWith("Re:") ? lastEmail.subject : `Re: ${lastEmail.subject || ""}`,
      };
    }

    if (replyMode === "forward") {
      const fwdSubject = lastEmail.subject?.startsWith("Fwd:") ? lastEmail.subject : `Fwd: ${lastEmail.subject || ""}`;
      const quotedBody = `<br/><br/>---------- Forwarded message ----------<br/>From: ${lastEmail.from?.email || "Unknown"}<br/>Date: ${format(new Date(lastEmail.receivedAt), "MMM d, yyyy h:mm a")}<br/>Subject: ${lastEmail.subject || "(No Subject)"}<br/><br/>${lastEmail.bodyHtml || lastEmail.bodyText || ""}`;
      return {
        replyToEmail: null,
        prefillTo: [],
        prefillCc: [],
        prefillSubject: fwdSubject,
        prefillBody: quotedBody,
      };
    }

    // Default reply
    return { replyToEmail: lastEmail };
  };

  if (!threadId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={0.75}
          stroke="currentColor"
          className="w-16 h-16 mb-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
        <p className="text-sm">Select an email to view</p>
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

  const replyData = getReplyData();

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#e5e5e5]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold truncate flex-1 text-[#171717]">
            {thread.subject || "(No Subject)"}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={handleArchive}
              className="p-2 rounded-lg hover:bg-[#f5f5f5] transition-colors text-neutral-500 hover:text-[#171717]"
              title="Archive"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f5f5f5] transition-colors text-neutral-500 hover:text-[#171717] lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tags and Stage */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wide">Stage:</span>
            <StageDropdown
              centralInboxId={centralInboxId}
              selectedStage={thread.stage}
              onStageChange={handleStageChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wide">Tags:</span>
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 min-w-0">
        {thread.emails.map((email, index) => {
          const emailId = email._id || email.id;
          const isExpanded = expandedEmails.has(emailId);

          return (
            <div
              key={emailId}
              className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm overflow-hidden min-w-0"
            >
              {/* Email Header - Always Visible */}
              <div
                onClick={() => toggleEmail(emailId)}
                className="p-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-neutral-600">
                        {(email.from?.name || email.from?.email || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>

                    {/* Sender Info */}
                    <div>
                      <div className="text-sm font-medium text-[#171717]">
                        {email.isSent ? (
                          <span className="text-neutral-500">
                            You to {email.to?.[0]?.email || "Unknown"}
                          </span>
                        ) : (
                          email.from?.name || email.from?.email || "Unknown"
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400">
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
                    className={`w-4 h-4 text-neutral-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>

                {/* Preview when collapsed */}
                {!isExpanded && (
                  <p className="text-sm text-neutral-400 mt-2 pl-12 line-clamp-2 break-words">
                    {email.bodyText?.slice(0, 200) || "(No content)"}
                  </p>
                )}
              </div>

              {/* Email Body - Expanded */}
              {isExpanded && (
                <div className="px-4 pb-4 overflow-hidden">
                  {/* To/CC */}
                  <div className="text-[12px] text-neutral-400 mb-4 pl-12">
                    <div>
                      To: {email.to?.map((t) => t.email).join(", ") || "Unknown"}
                    </div>
                    {email.cc?.length > 0 && (
                      <div>CC: {email.cc.map((c) => c.email).join(", ")}</div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="pl-12 min-w-0">
                    <div className="email-body-wrapper">
                      {email.bodyHtml ? (
                        <div
                          className="email-body-content prose prose-sm max-w-none prose-neutral"
                          dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm text-neutral-700 break-all">
                          {email.bodyText || "(No content)"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachments */}
                  {email.attachments?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#e5e5e5] pl-12">
                      <div className="text-xs font-medium text-neutral-500 mb-2">
                        Attachments ({email.attachments.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {email.attachments.map((att, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f5] rounded-lg text-xs text-neutral-600 border border-[#e5e5e5]"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
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

      {/* Reply Section */}
      <div className="p-4 border-t border-[#e5e5e5]">
        {showReplyComposer ? (
          <ReplyComposer
            centralInboxId={centralInboxId}
            replyToEmail={replyData.replyToEmail || thread.emails[thread.emails.length - 1]}
            prefillTo={replyData.prefillTo}
            prefillCc={replyData.prefillCc}
            prefillSubject={replyData.prefillSubject}
            prefillBody={replyData.prefillBody}
            onSent={() => {
              setShowReplyComposer(false);
              fetchThread();
              onThreadUpdate?.();
            }}
            onCancel={() => setShowReplyComposer(false)}
          />
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => openReply("reply")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#171717] text-white rounded-xl text-sm font-medium hover:bg-[#262626] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Reply
            </button>
            <button
              onClick={() => openReply("replyAll")}
              className="px-4 py-2.5 border border-[#e5e5e5] rounded-xl text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
              title="Reply All (Shift+R)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </button>
            <button
              onClick={() => openReply("forward")}
              className="px-4 py-2.5 border border-[#e5e5e5] rounded-xl text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
              title="Forward (f)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
