"use client";

export default function TagBadge({ tag, onRemove, size = "sm" }) {
  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${tag.color}10`,
        color: tag.color,
        borderColor: `${tag.color}25`,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          className="hover:opacity-70 transition-opacity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-3 h-3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
