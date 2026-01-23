"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import EmailList from "./EmailList";
import EmailDetail from "./EmailDetail";
import NotificationBell from "@/components/NotificationBell";
import SearchInput from "./SearchInput";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";

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
  const searchInputRef = useRef(null);
  const emailListRef = useRef(null);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input or textarea
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        // Allow Escape to blur input
        if (e.key === "Escape") {
          e.target.blur();
        }
        return;
      }

      switch (e.key) {
        case "j": // Next email
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

        case "k": // Previous email
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

        case "o": // Open email
        case "Enter":
          e.preventDefault();
          if (emails[selectedIndex]) {
            const email = emails[selectedIndex];
            handleSelectThread(email.threadId || email._id || email.id, email);
            setShowMobileDetail(true);
          }
          break;

        case "e": // Archive email
          e.preventDefault();
          if (selectedThreadId) {
            archiveEmail(selectedThreadId);
          }
          break;

        case "r": // Reply to email
          e.preventDefault();
          if (selectedThreadId) {
            setTriggerReply((n) => n + 1);
          }
          break;

        case "u": // Mark as unread
          e.preventDefault();
          if (selectedThreadId) {
            markAsUnread(selectedThreadId);
          }
          break;

        case "/": // Focus search
          e.preventDefault();
          searchInputRef.current?.focus();
          break;

        case "?": // Show shortcuts
          e.preventDefault();
          setShowShortcutsModal(true);
          break;

        case "Escape": // Close detail / Deselect
          e.preventDefault();
          if (showShortcutsModal) {
            setShowShortcutsModal(false);
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
  }, [emails, selectedIndex, selectedThreadId, showMobileDetail, showShortcutsModal]);

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
    <div className="h-screen flex overflow-hidden bg-base-100">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          onFilterChange={handleFilterChange}
          activeFilters={activeFilters}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Email List - Full width on mobile when detail is hidden */}
        <div
          className={`
            w-full md:w-80 lg:w-96 border-r border-base-300 flex flex-col
            ${showMobileDetail ? "hidden md:flex" : "flex"}
          `}
        >
          {/* Search & Filter Header */}
          <div className="p-2 border-b border-base-300 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchInput onSearch={handleSearch} inputRef={searchInputRef} />
              </div>
              <NotificationBell />
              <button
                onClick={() => setShowShortcutsModal(true)}
                className="btn btn-ghost btn-sm btn-circle"
                title="Keyboard shortcuts (?)"
              >
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
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                  />
                </svg>
              </button>
            </div>
            {/* Filter Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setFilter(null)}
                className={`btn btn-xs ${!filter ? "btn-primary" : "btn-ghost"}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`btn btn-xs ${
                  filter === "unread" ? "btn-primary" : "btn-ghost"
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter("assigned")}
                className={`btn btn-xs ${
                  filter === "assigned" ? "btn-primary" : "btn-ghost"
                }`}
              >
                Assigned
              </button>
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
            />
          </div>
        </div>

        {/* Email Detail - Hidden on mobile when list is shown */}
        <div
          className={`
            flex-1 flex flex-col
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
          <label tabIndex={0} className="btn btn-circle btn-primary shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </label>
          <div
            tabIndex={0}
            className="dropdown-content z-[1] mb-2 shadow-xl bg-base-100 rounded-box w-64"
          >
            <Sidebar
              onFilterChange={handleFilterChange}
              activeFilters={activeFilters}
            />
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
