"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import EmailList from "./EmailList";
import EmailDetail from "./EmailDetail";
import NotificationBell from "@/components/NotificationBell";
import SearchInput from "./SearchInput";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import ComposeModal from "./ComposeModal";
import BulkActionBar from "./BulkActionBar";

export default function InboxLayout({ centralInboxId, children }) {
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [filter, setFilter] = useState(null);
  const [activeFilters, setActiveFilters] = useState({ tags: [], stageId: null });
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emails, setEmails] = useState([]);
  const [triggerReply, setTriggerReply] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const searchInputRef = useRef(null);
  const emailListRef = useRef(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (res.ok) {
        setRefreshKey((k) => k + 1);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectThread = (threadId, email) => {
    setSelectedThreadId(threadId);
    setSelectedEmail(email);
    setShowMobileDetail(true);
  };

  const handleCloseDetail = () => {
    setShowMobileDetail(false);
    setSelectedThreadId(null);
    setSelectedEmail(null);
  };

  const handleFilterChange = useCallback((newFilters) => {
    setActiveFilters(newFilters);
  }, []);

  const handleThreadUpdate = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleEmailsLoaded = useCallback((loadedEmails) => {
    setEmails(loadedEmails);
  }, []);

  const handleToggleEmailSelection = useCallback((emailId) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedEmails(new Set());
  }, []);

  const handleBulkActionComplete = useCallback(() => {
    setSelectedEmails(new Set());
    setRefreshKey((k) => k + 1);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        if (e.key === "Escape") {
          e.target.blur();
        }
        return;
      }

      switch (e.key) {
        case "j":
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = Math.min(prev + 1, emails.length - 1);
            if (emails[newIndex]) {
              const email = emails[newIndex];
              handleSelectThread(email.threadId || email._id || email.id, email);
            }
            return newIndex;
          });
          break;

        case "k":
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = Math.max(prev - 1, 0);
            if (emails[newIndex]) {
              const email = emails[newIndex];
              handleSelectThread(email.threadId || email._id || email.id, email);
            }
            return newIndex;
          });
          break;

        case "o":
        case "Enter":
          e.preventDefault();
          if (emails[selectedIndex]) {
            const email = emails[selectedIndex];
            handleSelectThread(email.threadId || email._id || email.id, email);
            setShowMobileDetail(true);
          }
          break;

        case "e":
          e.preventDefault();
          if (selectedThreadId) {
            archiveEmail(selectedThreadId);
          }
          break;

        case "r":
          e.preventDefault();
          if (selectedThreadId) {
            setTriggerReply((n) => n + 1);
          }
          break;

        case "R":
          // Shift+R = Reply All (handled by EmailDetail via triggerReply)
          e.preventDefault();
          if (selectedThreadId) {
            setTriggerReply((n) => n + 1);
          }
          break;

        case "f":
          // Forward
          e.preventDefault();
          break;

        case "c":
          e.preventDefault();
          setShowCompose(true);
          break;

        case "u":
          e.preventDefault();
          if (selectedThreadId) {
            markAsUnread(selectedThreadId);
          }
          break;

        case "/":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;

        case "?":
          e.preventDefault();
          setShowShortcutsModal(true);
          break;

        case "Escape":
          e.preventDefault();
          if (showCompose) {
            setShowCompose(false);
          } else if (showShortcutsModal) {
            setShowShortcutsModal(false);
          } else if (selectedEmails.size > 0) {
            handleClearSelection();
          } else if (showMobileDetail) {
            handleCloseDetail();
          }
          break;

        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [emails, selectedIndex, selectedThreadId, showMobileDetail, showShortcutsModal, showCompose, selectedEmails]);

  const archiveEmail = async (threadId) => {
    try {
      await fetch(`/api/central-inboxes/${centralInboxId}/emails/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });
      handleThreadUpdate();
      handleCloseDetail();
    } catch (error) {
      console.error("Failed to archive email:", error);
    }
  };

  const markAsUnread = async (threadId) => {
    try {
      await fetch(`/api/central-inboxes/${centralInboxId}/emails/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: false }),
      });
      handleThreadUpdate();
    } catch (error) {
      console.error("Failed to mark as unread:", error);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          onFilterChange={handleFilterChange}
          activeFilters={activeFilters}
          onCompose={() => setShowCompose(true)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Email List */}
        <div
          className={`
            w-full md:w-80 lg:w-96 border-r border-[#e5e5e5] flex flex-col bg-white
            ${showMobileDetail ? "hidden md:flex" : "flex"}
          `}
        >
          {/* Search & Filter Header */}
          <div className="p-2 border-b border-[#e5e5e5] space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchInput onSearch={handleSearch} inputRef={searchInputRef} />
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="p-2 rounded-lg hover:bg-[#f5f5f5] transition-colors text-neutral-500"
                title="Sync emails"
              >
                {syncing ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                )}
              </button>
              <NotificationBell />
              <button
                onClick={() => setShowShortcutsModal(true)}
                className="p-2 rounded-lg hover:bg-[#f5f5f5] transition-colors text-neutral-500"
                title="Keyboard shortcuts (?)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </button>
            </div>
            {/* Filter Tabs */}
            <div className="flex gap-1">
              {[
                { key: null, label: "All" },
                { key: "unread", label: "Unread" },
                { key: "assigned", label: "Assigned" },
              ].map((f) => (
                <button
                  key={f.key || "all"}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    filter === f.key
                      ? "bg-[#171717] text-white"
                      : "text-neutral-500 hover:bg-[#f5f5f5]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email List */}
          <div className="flex-1 overflow-hidden" ref={emailListRef}>
            <EmailList
              centralInboxId={centralInboxId}
              selectedThreadId={selectedThreadId}
              onSelectThread={handleSelectThread}
              filter={filter}
              activeFilters={activeFilters}
              refreshKey={refreshKey}
              searchQuery={searchQuery}
              onEmailsLoaded={handleEmailsLoaded}
              selectedIndex={selectedIndex}
              selectedEmails={selectedEmails}
              onToggleEmailSelection={handleToggleEmailSelection}
            />
          </div>
        </div>

        {/* Email Detail */}
        <div
          className={`
            flex-1 flex flex-col min-w-0 overflow-hidden
            ${showMobileDetail ? "flex" : "hidden md:flex"}
          `}
        >
          <EmailDetail
            centralInboxId={centralInboxId}
            threadId={selectedThreadId}
            onClose={handleCloseDetail}
            onThreadUpdate={handleThreadUpdate}
            triggerReply={triggerReply}
          />
        </div>
      </div>

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed bottom-4 left-4 z-50">
        <div className="dropdown dropdown-top">
          <label tabIndex={0} className="w-12 h-12 rounded-full bg-[#171717] text-white shadow-lg flex items-center justify-center cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </label>
          <div tabIndex={0} className="dropdown-content z-[1] mb-2 shadow-xl rounded-xl w-64 overflow-hidden">
            <Sidebar
              onFilterChange={handleFilterChange}
              activeFilters={activeFilters}
              onCompose={() => setShowCompose(true)}
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedEmails.size > 0 && (
        <BulkActionBar
          centralInboxId={centralInboxId}
          selectedCount={selectedEmails.size}
          selectedEmailIds={[...selectedEmails]}
          onClear={handleClearSelection}
          onActionComplete={handleBulkActionComplete}
        />
      )}

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          centralInboxId={centralInboxId}
          onClose={() => setShowCompose(false)}
          onSent={() => {
            setShowCompose(false);
            handleThreadUpdate();
          }}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
