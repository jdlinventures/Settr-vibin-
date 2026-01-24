"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

export default function ReplyComposer({
  centralInboxId,
  replyToEmail,
  onSent,
  onCancel,
}) {
  const [connectedEmails, setConnectedEmails] = useState([]);
  const [selectedEmailId, setSelectedEmailId] = useState("");
  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [subject, setSubject] = useState("");
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimer = useRef(null);
  const draftId = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Write your reply...",
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3",
      },
    },
  });

  // Fetch connected emails
  useEffect(() => {
    fetchConnectedEmails();
  }, []);

  // Pre-fill reply data
  useEffect(() => {
    if (replyToEmail) {
      // Set To field (reply to sender)
      if (replyToEmail.from?.email) {
        setTo([replyToEmail.from]);
      }

      // Set subject with Re: prefix
      if (replyToEmail.subject) {
        const subj = replyToEmail.subject;
        setSubject(subj.startsWith("Re:") ? subj : `Re: ${subj}`);
      }
    }
  }, [replyToEmail]);

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
            replyToEmailId: replyToEmail?._id || replyToEmail?.id,
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
  }, [editor, centralInboxId, replyToEmail, selectedEmailId, to, cc, subject]);

  const fetchConnectedEmails = async () => {
    try {
      const res = await fetch("/api/emails");
      if (res.ok) {
        const data = await res.json();
        setConnectedEmails(data);
        // Auto-select first email if only one
        if (data.length === 1) {
          setSelectedEmailId(data[0]._id || data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch connected emails:", err);
    }
  };

  const addRecipient = (type, input, setInput, list, setList) => {
    const email = input.trim().toLowerCase();
    if (!email) return;

    // Basic email validation
    if (!email.includes("@")) return;

    // Check for duplicates
    if (list.some((r) => r.email === email)) {
      setInput("");
      return;
    }

    setList([...list, { email, name: "" }]);
    setInput("");
  };

  const removeRecipient = (type, email, list, setList) => {
    setList(list.filter((r) => r.email !== email));
  };

  const handleKeyDown = (e, type, input, setInput, list, setList) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRecipient(type, input, setInput, list, setList);
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
          subject,
          bodyHtml: editor.getHTML(),
          replyToEmailId: replyToEmail?._id || replyToEmail?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      // Clear auto-save timer
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
    // Delete draft if exists
    if (draftId.current) {
      try {
        await fetch(`/api/drafts/${draftId.current}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Failed to delete draft:", err);
      }
    }

    // Clear auto-save timer
    if (autoSaveTimer.current) {
      clearInterval(autoSaveTimer.current);
    }

    onCancel?.();
  };

  return (
    <div className="border border-base-300 rounded-lg bg-base-100">
      {/* Header */}
      <div className="p-3 border-b border-base-300 space-y-2">
        {/* From selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-base-content/70 w-12">From:</label>
          <select
            value={selectedEmailId}
            onChange={(e) => setSelectedEmailId(e.target.value)}
            className="select select-sm select-bordered flex-1"
          >
            <option value="">Select email account</option>
            {connectedEmails.map((email) => (
              <option key={email._id || email.id} value={email._id || email.id}>
                {email.emailAddress}
              </option>
            ))}
          </select>
        </div>

        {/* To field */}
        <div className="flex items-start gap-2">
          <label className="text-sm text-base-content/70 w-12 pt-1">To:</label>
          <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[32px] p-1 border border-base-300 rounded-lg bg-base-100">
            {to.map((recipient) => (
              <span
                key={recipient.email}
                className="badge badge-sm gap-1"
              >
                {recipient.email}
                <button
                  onClick={() => removeRecipient("to", recipient.email, to, setTo)}
                  className="hover:text-error"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "to", toInput, setToInput, to, setTo)}
              onBlur={() => addRecipient("to", toInput, setToInput, to, setTo)}
              placeholder={to.length === 0 ? "Add recipients..." : ""}
              className="flex-1 min-w-[100px] bg-transparent text-sm outline-none px-1"
            />
          </div>
        </div>

        {/* CC field */}
        <div className="flex items-start gap-2">
          <label className="text-sm text-base-content/70 w-12 pt-1">CC:</label>
          <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[32px] p-1 border border-base-300 rounded-lg bg-base-100">
            {cc.map((recipient) => (
              <span
                key={recipient.email}
                className="badge badge-sm gap-1"
              >
                {recipient.email}
                <button
                  onClick={() => removeRecipient("cc", recipient.email, cc, setCc)}
                  className="hover:text-error"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "cc", ccInput, setCcInput, cc, setCc)}
              onBlur={() => addRecipient("cc", ccInput, setCcInput, cc, setCc)}
              placeholder=""
              className="flex-1 min-w-[100px] bg-transparent text-sm outline-none px-1"
            />
          </div>
        </div>

        {/* Subject */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-base-content/70 w-12">Subj:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="input input-sm input-bordered flex-1"
          />
        </div>
      </div>

      {/* Editor */}
      <div className="border-b border-base-300">
        {/* Toolbar */}
        {editor && (
          <div className="flex items-center gap-1 p-2 border-b border-base-200">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`btn btn-xs btn-ghost ${
                editor.isActive("bold") ? "btn-active" : ""
              }`}
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`btn btn-xs btn-ghost ${
                editor.isActive("italic") ? "btn-active" : ""
              }`}
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`btn btn-xs btn-ghost ${
                editor.isActive("bulletList") ? "btn-active" : ""
              }`}
            >
              • List
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`btn btn-xs btn-ghost ${
                editor.isActive("orderedList") ? "btn-active" : ""
              }`}
            >
              1. List
            </button>
          </div>
        )}

        <EditorContent editor={editor} />
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSend}
            disabled={sending}
            className="btn btn-primary btn-sm"
          >
            {sending ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Sending...
              </>
            ) : (
              <>
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
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
                Send
              </>
            )}
          </button>
          <button
            onClick={handleDiscard}
            disabled={sending}
            className="btn btn-ghost btn-sm"
          >
            Discard
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-base-content/50">
          {lastSaved && (
            <span>Saved {lastSaved.toLocaleTimeString()}</span>
          )}
          {error && <span className="text-error">{error}</span>}
        </div>
      </div>
    </div>
  );
}
