"use client";

import { formatDistanceToNow } from "date-fns";
import TagBadge from "./TagBadge";

export default function EmailListItem({ email, isSelected, isKeyboardSelected, onClick, showCheckbox, isChecked, onCheckChange }) {
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
        group px-4 py-3 border-b border-[#e5e5e5] cursor-pointer transition-all duration-150
        hover:bg-[#f5f5f5]
        ${isSelected ? "bg-[#f5f5f5]" : ""}
        ${isKeyboardSelected && !isSelected ? "ring-1 ring-inset ring-neutral-300" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox for bulk select */}
        {showCheckbox && (
          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => onCheckChange?.(e.target.checked)}
              className="checkbox checkbox-sm rounded-full border-neutral-300"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Top row: Sender, unread dot, and time */}
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isUnread && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#171717] flex-shrink-0" />
              )}
              <span
                className={`text-[13px] truncate ${
                  isUnread ? "font-semibold text-[#171717]" : "font-normal text-neutral-600"
                }`}
              >
                {getSenderDisplay()}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 ml-2 whitespace-nowrap">
              {getTimeDisplay()}
            </span>
          </div>

          {/* Subject */}
          <div
            className={`text-[13px] truncate mb-0.5 ${
              isUnread ? "font-medium text-[#171717]" : "font-normal text-neutral-500"
            }`}
          >
            {email.subject || "(No Subject)"}
          </div>

          {/* Preview */}
          <div className="text-[12px] text-neutral-400 truncate">{getPreview()}</div>

          {/* Bottom row: Thread count, stage, and tags */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {email.threadEmailCount > 1 && (
              <span className="text-[11px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                {email.threadEmailCount}
              </span>
            )}
            {email.threadUnreadCount > 0 && (
              <span className="text-[11px] font-medium text-[#171717] bg-neutral-200 px-1.5 py-0.5 rounded">
                {email.threadUnreadCount} new
              </span>
            )}
            {email.isLead && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-100 font-medium">
                Lead
              </span>
            )}
            {email.stage && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${email.stage.color}15`,
                  color: email.stage.color,
                  border: `1px solid ${email.stage.color}30`,
                }}
              >
                {email.stage.name}
              </span>
            )}
            {email.tags?.slice(0, 2).map((tag) => (
              <TagBadge key={tag._id || tag.id} tag={tag} size="xs" />
            ))}
            {email.tags?.length > 2 && (
              <span className="text-[11px] text-neutral-400">
                +{email.tags.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
