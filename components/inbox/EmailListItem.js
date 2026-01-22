"use client";

import { formatDistanceToNow } from "date-fns";

export default function EmailListItem({ email, isSelected, onClick }) {
  const isUnread = !email.isRead || email.threadUnreadCount > 0;

  // Get preview text from body
  const getPreview = () => {
    const text = email.bodyText || "";
    return text.slice(0, 100).replace(/\s+/g, " ").trim() || "(No content)";
  };

  // Format sender name
  const getSenderDisplay = () => {
    if (email.isSent) {
      const to = email.to?.[0];
      return `To: ${to?.name || to?.email || "Unknown"}`;
    }
    return email.from?.name || email.from?.email || "Unknown";
  };

  // Format time
  const getTimeDisplay = () => {
    try {
      return formatDistanceToNow(new Date(email.receivedAt), {
        addSuffix: false,
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        px-4 py-3 border-b border-base-200 cursor-pointer transition-colors
        hover:bg-base-200
        ${isSelected ? "bg-base-200 border-l-2 border-l-primary" : ""}
        ${isUnread ? "bg-base-100" : "bg-base-100/50"}
      `}
    >
      {/* Top row: Sender and time */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-sm truncate flex-1 ${
            isUnread ? "font-semibold" : "font-normal"
          }`}
        >
          {getSenderDisplay()}
        </span>
        <span className="text-xs text-base-content/50 ml-2 whitespace-nowrap">
          {getTimeDisplay()}
        </span>
      </div>

      {/* Subject */}
      <div
        className={`text-sm truncate mb-1 ${
          isUnread ? "font-medium" : "font-normal text-base-content/80"
        }`}
      >
        {email.subject || "(No Subject)"}
      </div>

      {/* Preview */}
      <div className="text-xs text-base-content/60 truncate">{getPreview()}</div>

      {/* Bottom row: Thread count and tags */}
      <div className="flex items-center gap-2 mt-2">
        {email.threadEmailCount > 1 && (
          <span className="badge badge-sm badge-ghost">
            {email.threadEmailCount} messages
          </span>
        )}
        {email.threadUnreadCount > 0 && (
          <span className="badge badge-sm badge-primary">
            {email.threadUnreadCount} new
          </span>
        )}
      </div>
    </div>
  );
}
