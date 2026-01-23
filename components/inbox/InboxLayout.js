"use client";

import { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import EmailList from "./EmailList";
import EmailDetail from "./EmailDetail";

export default function InboxLayout({ centralInboxId, children }) {
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [filter, setFilter] = useState(null);
  const [activeFilters, setActiveFilters] = useState({ tags: [], stageId: null });
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectThread = (threadId, email) => {
    setSelectedThreadId(threadId);
    setSelectedEmail(email);
    setShowMobileDetail(true);
  };

  const handleCloseDetail = () => {
    setShowMobileDetail(false);
  };

  const handleFilterChange = useCallback((newFilters) => {
    setActiveFilters(newFilters);
  }, []);

  const handleThreadUpdate = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

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
          {/* Filter Tabs */}
          <div className="p-2 border-b border-base-300 flex gap-1">
            <button
              onClick={() => setFilter(null)}
              className={`btn btn-sm ${!filter ? "btn-primary" : "btn-ghost"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`btn btn-sm ${
                filter === "unread" ? "btn-primary" : "btn-ghost"
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter("assigned")}
              className={`btn btn-sm ${
                filter === "assigned" ? "btn-primary" : "btn-ghost"
              }`}
            >
              Assigned
            </button>
          </div>

          {/* Email List */}
          <div className="flex-1 overflow-hidden">
            <EmailList
              centralInboxId={centralInboxId}
              selectedThreadId={selectedThreadId}
              onSelectThread={handleSelectThread}
              filter={filter}
              activeFilters={activeFilters}
              refreshKey={refreshKey}
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
    </div>
  );
}
