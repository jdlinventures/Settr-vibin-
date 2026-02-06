"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";

export default function LeadDetail({ lead, centralInboxId, stages, onClose, onUpdate, onEdit }) {
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  const leadId = lead.id || lead._id;

  const handleStageChange = async (e) => {
    setUpdatingStage(true);
    try {
      await fetch(`/api/central-inboxes/${centralInboxId}/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: e.target.value || null }),
      });
      onUpdate?.();
    } catch (error) {
      console.error("Failed to update stage:", error);
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await fetch(
        `/api/central-inboxes/${centralInboxId}/leads/${leadId}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: noteText.trim() }),
        }
      );
      setNoteText("");
      onUpdate?.();
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await fetch(
        `/api/central-inboxes/${centralInboxId}/leads/${leadId}/notes?noteId=${noteId}`,
        { method: "DELETE" }
      );
      onUpdate?.();
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this lead? This cannot be undone.")) return;
    try {
      await fetch(
        `/api/central-inboxes/${centralInboxId}/leads/${leadId}`,
        { method: "DELETE" }
      );
      onClose?.();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to delete lead:", error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-neutral-600">
              {(lead.firstName || lead.email || "?").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#171717] truncate">
              {lead.firstName || lead.lastName
                ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
                : lead.email}
            </h3>
            <p className="text-[11px] text-neutral-400 truncate">{lead.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit?.(lead)}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors text-neutral-400 hover:text-[#171717]"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors text-neutral-400 hover:text-[#171717]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Stage */}
        <div>
          <label className="text-[11px] text-neutral-400 uppercase tracking-wide block mb-1.5">Stage</label>
          <select
            value={lead.stageId?._id || lead.stageId?.id || ""}
            onChange={handleStageChange}
            disabled={updatingStage}
            className="w-full px-3 py-2 bg-[#f5f5f5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717] border-0"
          >
            <option value="">No Stage</option>
            {stages.map((stage) => (
              <option key={stage._id || stage.id} value={stage._id || stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>

        {/* Contact Info */}
        <div>
          <label className="text-[11px] text-neutral-400 uppercase tracking-wide block mb-2">Contact Info</label>
          <div className="space-y-2">
            {lead.company && (
              <div className="flex items-center gap-2 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-400 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
                <span className="text-neutral-600">{lead.company}</span>
              </div>
            )}
            {lead.title && (
              <div className="flex items-center gap-2 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-400 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <span className="text-neutral-600">{lead.title}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-400 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span className="text-neutral-600">{lead.phone}</span>
              </div>
            )}
            {lead.website && (
              <div className="flex items-center gap-2 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-400 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:underline">
                  {lead.website}
                </a>
              </div>
            )}
            {lead.linkedIn && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <a href={lead.linkedIn.startsWith("http") ? lead.linkedIn : `https://${lead.linkedIn}`} target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:underline">
                  LinkedIn
                </a>
              </div>
            )}
            {!lead.company && !lead.title && !lead.phone && !lead.website && !lead.linkedIn && (
              <p className="text-xs text-neutral-300">No contact details added</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div>
          <label className="text-[11px] text-neutral-400 uppercase tracking-wide block mb-2">Activity</label>
          <div className="space-y-1.5 text-xs">
            {lead.followUpDate && (
              <div className={`flex justify-between ${new Date(lead.followUpDate) <= new Date() ? "text-red-500" : "text-neutral-500"}`}>
                <span>Follow-up</span>
                <span className="font-medium">{format(new Date(lead.followUpDate), "MMM d, yyyy")}</span>
              </div>
            )}
            {lead.lastContactedAt && (
              <div className="flex justify-between text-neutral-500">
                <span>Last contacted</span>
                <span>{format(new Date(lead.lastContactedAt), "MMM d, yyyy")}</span>
              </div>
            )}
            {lead.lastRepliedAt && (
              <div className="flex justify-between text-neutral-500">
                <span>Last replied</span>
                <span>{format(new Date(lead.lastRepliedAt), "MMM d, yyyy")}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-400">
              <span>Created</span>
              <span>{format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Source</span>
              <span className="capitalize">{lead.source?.replace("_", " ") || "manual"}</span>
            </div>
          </div>
        </div>

        {/* Email Threads */}
        {lead.emailThreadIds?.length > 0 && (
          <div>
            <label className="text-[11px] text-neutral-400 uppercase tracking-wide block mb-2">
              Linked Threads ({lead.emailThreadIds.length})
            </label>
            <div className="space-y-1">
              {lead.emailThreadIds.slice(0, 5).map((threadId) => (
                <Link
                  key={threadId}
                  href={`/dashboard/inbox/${centralInboxId}?thread=${threadId}`}
                  className="block px-3 py-2 bg-[#f5f5f5] rounded-lg text-xs text-neutral-600 hover:bg-[#e5e5e5] transition-colors truncate"
                >
                  Thread: {threadId.slice(0, 20)}...
                </Link>
              ))}
              {lead.emailThreadIds.length > 5 && (
                <p className="text-[10px] text-neutral-400 px-3">
                  +{lead.emailThreadIds.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {lead.tags?.length > 0 && (
          <div>
            <label className="text-[11px] text-neutral-400 uppercase tracking-wide block mb-2">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {lead.tags.map((tag) => (
                <span
                  key={tag._id || tag.id}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-[11px] text-neutral-400 uppercase tracking-wide block mb-2">Notes</label>
          <form onSubmit={handleAddNote} className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Add a note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#f5f5f5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
            />
            <button
              type="submit"
              disabled={addingNote || !noteText.trim()}
              className="px-3 py-2 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] disabled:opacity-30 transition-colors"
            >
              {addingNote ? "..." : "Add"}
            </button>
          </form>
          <div className="space-y-2">
            {(lead.notes || []).slice().reverse().map((note) => (
              <div key={note._id || note.id} className="group px-3 py-2 bg-[#f5f5f5] rounded-lg">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-neutral-700">{note.text}</p>
                  <button
                    onClick={() => handleDeleteNote(note._id || note.id)}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#e5e5e5] transition-all text-neutral-400"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {note.userId?.name || "You"} &middot; {format(new Date(note.createdAt), "MMM d, h:mm a")}
                </p>
              </div>
            ))}
            {(!lead.notes || lead.notes.length === 0) && (
              <p className="text-xs text-neutral-300">No notes yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#e5e5e5]">
        <button
          onClick={handleDelete}
          className="w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          Delete Lead
        </button>
      </div>
    </div>
  );
}
