"use client";

import { formatDistanceToNow } from "date-fns";
import TagBadge from "./TagBadge";

export default function EmailListItem({ email, isSelected, isKeyboardSelected, onClick }) {
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
        ${isKeyboardSelected && !isSelected ? "ring-2 ring-inset ring-primary/30" : ""}
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

      {/* Bottom row: Thread count, stage, and tags */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
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
        {email.stage && (
          <span
            className="badge badge-sm"
            style={{
              backgroundColor: `${email.stage.color}20`,
              color: email.stage.color,
              border: `1px solid ${email.stage.color}40`,
            }}
          >
            {email.stage.name}
          </span>
        )}
        {email.tags?.slice(0, 2).map((tag) => (
          <TagBadge key={tag._id || tag.id} tag={tag} size="xs" />
        ))}
        {email.tags?.length > 2 && (
          <span className="text-xs text-base-content/50">
            +{email.tags.length - 2}
          </span>
        )}
      </div>
    </div>
  );
}
