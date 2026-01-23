"use client";

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "j", description: "Next email" },
    { key: "k", description: "Previous email" },
    { key: "o / Enter", description: "Open selected email" },
    { key: "e", description: "Archive email" },
    { key: "r", description: "Reply to email" },
    { key: "u", description: "Mark as unread" },
    { key: "/", description: "Focus search" },
    { key: "Esc", description: "Close / Deselect" },
    { key: "?", description: "Show shortcuts" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
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

        <div className="p-4">
          <div className="space-y-2">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between py-2"
              >
                <span className="text-base-content/70">{shortcut.description}</span>
                <kbd className="kbd kbd-sm">{shortcut.key}</kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-base-300 text-center">
          <p className="text-sm text-base-content/50">
            Press <kbd className="kbd kbd-xs">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}
