"use client";

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "j", description: "Next email" },
    { key: "k", description: "Previous email" },
    { key: "o / Enter", description: "Open selected email" },
    { key: "e", description: "Archive email" },
    { key: "r", description: "Reply to email" },
    { key: "Shift+R", description: "Reply all" },
    { key: "f", description: "Forward email" },
    { key: "c", description: "Compose new email" },
    { key: "u", description: "Mark as unread" },
    { key: "/", description: "Focus search" },
    { key: "Esc", description: "Close / Deselect" },
    { key: "?", description: "Show shortcuts" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_150ms_ease-out]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 border border-[#e5e5e5]">
        <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#171717]">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-1">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#f5f5f5] transition-colors"
              >
                <span className="text-sm text-neutral-600">{shortcut.description}</span>
                <kbd className="px-2 py-0.5 text-xs font-mono bg-[#f5f5f5] border border-[#e5e5e5] rounded text-neutral-600">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-[#e5e5e5] text-center">
          <p className="text-xs text-neutral-400">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#f5f5f5] border border-[#e5e5e5] rounded">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}
