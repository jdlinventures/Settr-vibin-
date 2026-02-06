"use client";

import { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

export default function ComposeModal({ centralInboxId, onClose, onSent }) {
  const [connectedEmails, setConnectedEmails] = useState([]);
  const [selectedEmailId, setSelectedEmailId] = useState("");
  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);
  const [subject, setSubject] = useState("");
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimer = useRef(null);
  const draftId = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your message..." }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none prose-neutral focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  useEffect(() => {
    fetchConnectedEmails();
  }, []);

  // Auto-save draft every 5 seconds
  useEffect(() => {
    if (!editor || !centralInboxId) return;

    const saveDraft = async () => {
      const bodyHtml = editor.getHTML();
      if (!bodyHtml || bodyHtml === "<p></p>") return;

      try {
        const res = await fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            centralInboxId,
            sendFromEmailId: selectedEmailId || undefined,
            to,
            cc,
            subject,
            bodyHtml,
          }),
        });

        if (res.ok) {
          const draft = await res.json();
          draftId.current = draft._id || draft.id;
          setLastSaved(new Date());
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    };

    autoSaveTimer.current = setInterval(saveDraft, 5000);

    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }
    };
  }, [editor, centralInboxId, selectedEmailId, to, cc, subject]);

  const fetchConnectedEmails = async () => {
    try {
      const res = await fetch("/api/emails");
      if (res.ok) {
        const data = await res.json();
        setConnectedEmails(data);
        if (data.length === 1) {
          setSelectedEmailId(data[0]._id || data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch connected emails:", err);
    }
  };

  const addRecipient = (input, setInput, list, setList) => {
    const email = input.trim().toLowerCase();
    if (!email) return;
    if (!email.includes("@")) return;
    if (list.some((r) => r.email === email)) {
      setInput("");
      return;
    }
    setList([...list, { email, name: "" }]);
    setInput("");
  };

  const removeRecipient = (email, list, setList) => {
    setList(list.filter((r) => r.email !== email));
  };

  const handleKeyDown = (e, input, setInput, list, setList) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRecipient(input, setInput, list, setList);
    }
  };

  const handleSend = async () => {
    if (!selectedEmailId) {
      setError("Please select an email account to send from");
      return;
    }
    if (to.length === 0) {
      setError("Please add at least one recipient");
      return;
    }
    if (!subject.trim()) {
      setError("Please add a subject");
      return;
    }
    if (!editor?.getHTML() || editor.getHTML() === "<p></p>") {
      setError("Please write a message");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendFromEmailId: selectedEmailId,
          centralInboxId,
          to,
          cc,
          bcc,
          subject,
          bodyHtml: editor.getHTML(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }

      onSent?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDiscard = async () => {
    if (draftId.current) {
      try {
        await fetch(`/api/drafts/${draftId.current}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete draft:", err);
      }
    }

    if (autoSaveTimer.current) {
      clearInterval(autoSaveTimer.current);
    }

    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-[fadeIn_150ms_ease-out]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-2xl mx-0 sm:mx-4 max-h-[90vh] flex flex-col animate-[slideUp_200ms_ease-out] border border-[#e5e5e5]">
        {/* Header */}
        <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-[#171717]">New Message</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Fields */}
        <div className="p-3 border-b border-[#e5e5e5] space-y-2 flex-shrink-0">
          {/* From */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-400 w-12">From:</label>
            <select
              value={selectedEmailId}
              onChange={(e) => setSelectedEmailId(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-[#f5f5f5] border-0 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300"
            >
              <option value="">Select email account</option>
              {connectedEmails.map((email) => (
                <option key={email._id || email.id} value={email._id || email.id}>
                  {email.emailAddress}
                </option>
              ))}
            </select>
          </div>

          {/* To */}
          <div className="flex items-start gap-2">
            <label className="text-xs text-neutral-400 w-12 pt-1.5">To:</label>
            <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[32px] p-1 bg-[#f5f5f5] rounded-md">
              {to.map((recipient) => (
                <span key={recipient.email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded text-xs border border-[#e5e5e5]">
                  {recipient.email}
                  <button onClick={() => removeRecipient(recipient.email, to, setTo)} className="hover:text-red-500 transition-colors">
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, toInput, setToInput, to, setTo)}
                onBlur={() => addRecipient(toInput, setToInput, to, setTo)}
                placeholder={to.length === 0 ? "Add recipients..." : ""}
                className="flex-1 min-w-[100px] bg-transparent text-sm outline-none px-1"
              />
            </div>
            <div className="flex gap-1 pt-1.5">
              {!showCc && (
                <button onClick={() => setShowCc(true)} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                  CC
                </button>
              )}
              {!showBcc && (
                <button onClick={() => setShowBcc(true)} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                  BCC
                </button>
              )}
            </div>
          </div>

          {/* CC */}
          {showCc && (
            <div className="flex items-start gap-2">
              <label className="text-xs text-neutral-400 w-12 pt-1.5">CC:</label>
              <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[32px] p-1 bg-[#f5f5f5] rounded-md">
                {cc.map((recipient) => (
                  <span key={recipient.email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded text-xs border border-[#e5e5e5]">
                    {recipient.email}
                    <button onClick={() => removeRecipient(recipient.email, cc, setCc)} className="hover:text-red-500 transition-colors">
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, ccInput, setCcInput, cc, setCc)}
                  onBlur={() => addRecipient(ccInput, setCcInput, cc, setCc)}
                  placeholder=""
                  className="flex-1 min-w-[100px] bg-transparent text-sm outline-none px-1"
                />
              </div>
            </div>
          )}

          {/* BCC */}
          {showBcc && (
            <div className="flex items-start gap-2">
              <label className="text-xs text-neutral-400 w-12 pt-1.5">BCC:</label>
              <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[32px] p-1 bg-[#f5f5f5] rounded-md">
                {bcc.map((recipient) => (
                  <span key={recipient.email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded text-xs border border-[#e5e5e5]">
                    {recipient.email}
                    <button onClick={() => removeRecipient(recipient.email, bcc, setBcc)} className="hover:text-red-500 transition-colors">
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, bccInput, setBccInput, bcc, setBcc)}
                  onBlur={() => addRecipient(bccInput, setBccInput, bcc, setBcc)}
                  placeholder=""
                  className="flex-1 min-w-[100px] bg-transparent text-sm outline-none px-1"
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-400 w-12">Subj:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 px-2.5 py-1.5 bg-[#f5f5f5] border-0 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300"
            />
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto border-b border-[#e5e5e5]">
          {/* Toolbar */}
          {editor && (
            <div className="flex items-center gap-0.5 p-2 border-b border-[#f0f0f0]">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  editor.isActive("bold") ? "bg-[#f0f0f0] text-[#171717]" : "text-neutral-500 hover:bg-[#f5f5f5]"
                }`}
              >
                <strong>B</strong>
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  editor.isActive("italic") ? "bg-[#f0f0f0] text-[#171717]" : "text-neutral-500 hover:bg-[#f5f5f5]"
                }`}
              >
                <em>I</em>
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  editor.isActive("bulletList") ? "bg-[#f0f0f0] text-[#171717]" : "text-neutral-500 hover:bg-[#f5f5f5]"
                }`}
              >
                List
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  editor.isActive("orderedList") ? "bg-[#f0f0f0] text-[#171717]" : "text-neutral-500 hover:bg-[#f5f5f5]"
                }`}
              >
                1.
              </button>
            </div>
          )}

          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="p-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-4 py-2 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {sending ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Sending...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Send
                </>
              )}
            </button>
            <button
              onClick={handleDiscard}
              disabled={sending}
              className="px-3 py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              Discard
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            {lastSaved && (
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            )}
            {error && <span className="text-red-500">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
