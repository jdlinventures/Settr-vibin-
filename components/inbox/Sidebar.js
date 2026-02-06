"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function Sidebar({ onInboxChange, onFilterChange, activeFilters = {}, onCompose }) {
  const params = useParams();
  const router = useRouter();
  const [inboxes, setInboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewInbox, setShowNewInbox] = useState(false);
  const [newInboxName, setNewInboxName] = useState("");
  const [tags, setTags] = useState([]);
  const [stages, setStages] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);

  const currentInboxId = params.centralInboxId;

  useEffect(() => {
    fetchInboxes();
  }, []);

  useEffect(() => {
    if (currentInboxId) {
      fetchTags();
      fetchStages();
    }
  }, [currentInboxId]);

  const fetchTags = async () => {
    if (!currentInboxId) return;
    setLoadingTags(true);
    try {
      const res = await fetch(`/api/central-inboxes/${currentInboxId}/tags`);
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    } finally {
      setLoadingTags(false);
    }
  };

  const fetchStages = async () => {
    if (!currentInboxId) return;
    setLoadingStages(true);
    try {
      const res = await fetch(`/api/central-inboxes/${currentInboxId}/stages`);
      if (res.ok) {
        const data = await res.json();
        setStages(data);
      }
    } catch (error) {
      console.error("Failed to fetch stages:", error);
    } finally {
      setLoadingStages(false);
    }
  };

  const toggleTagFilter = (tagId) => {
    const currentTags = activeFilters.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((id) => id !== tagId)
      : [...currentTags, tagId];
    onFilterChange?.({ ...activeFilters, tags: newTags });
  };

  const setStageFilter = (stageId) => {
    onFilterChange?.({ ...activeFilters, stageId: stageId === activeFilters.stageId ? null : stageId });
  };

  const fetchInboxes = async () => {
    try {
      const res = await fetch("/api/central-inboxes");
      if (res.ok) {
        const data = await res.json();
        setInboxes(data);
      }
    } catch (error) {
      console.error("Failed to fetch inboxes:", error);
    } finally {
      setLoading(false);
    }
  };

  const createInbox = async (e) => {
    e.preventDefault();
    if (!newInboxName.trim()) return;

    try {
      const res = await fetch("/api/central-inboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newInboxName }),
      });

      if (res.ok) {
        const newInbox = await res.json();
        setInboxes([newInbox, ...inboxes]);
        setNewInboxName("");
        setShowNewInbox(false);
        router.push(`/dashboard/inbox/${newInbox.id || newInbox._id}`);
      }
    } catch (error) {
      console.error("Failed to create inbox:", error);
    }
  };

  return (
    <aside className="w-64 sidebar-dark h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold text-white tracking-tight">Settr</h1>
      </div>

      {/* Compose Button */}
      {currentInboxId && onCompose && (
        <div className="px-3 pt-3">
          <button
            onClick={onCompose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-[#171717] rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Compose
          </button>
        </div>
      )}

      {/* Inboxes List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
            Inboxes
          </span>
          <button
            onClick={() => setShowNewInbox(!showNewInbox)}
            className="p-1 rounded hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {/* New Inbox Form */}
        {showNewInbox && (
          <form onSubmit={createInbox} className="px-2 mb-3">
            <input
              type="text"
              placeholder="Inbox name..."
              value={newInboxName}
              onChange={(e) => setNewInboxName(e.target.value)}
              className="w-full px-3 py-1.5 bg-white/10 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              autoFocus
            />
            <div className="flex gap-1 mt-1.5">
              <button type="submit" className="flex-1 px-3 py-1 bg-white text-[#171717] rounded text-xs font-medium hover:bg-white/90 transition-colors">
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewInbox(false)}
                className="px-3 py-1 text-white/50 hover:text-white/70 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Inbox List */}
        {loading ? (
          <div className="flex justify-center p-4">
            <span className="loading loading-spinner loading-sm text-white/30"></span>
          </div>
        ) : inboxes.length === 0 ? (
          <p className="text-sm text-white/30 px-2">No inboxes yet</p>
        ) : (
          <div className="space-y-0.5">
            {inboxes.map((inbox) => {
              const inboxId = inbox.id || inbox._id;
              const isActive = currentInboxId === inboxId;
              return (
                <Link
                  key={inboxId}
                  href={`/dashboard/inbox/${inboxId}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? "bg-white/15 text-white border-l-2 border-white/50"
                      : "text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: inbox.color || "#737373" }}
                  />
                  <span className="truncate">{inbox.name}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Stages Section */}
        {currentInboxId && (
          <div className="mt-5">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                Stages
              </span>
            </div>
            {loadingStages ? (
              <div className="flex justify-center p-2">
                <span className="loading loading-spinner loading-xs text-white/30"></span>
              </div>
            ) : stages.length === 0 ? (
              <p className="text-xs text-white/30 px-2">No stages</p>
            ) : (
              <div className="space-y-0.5">
                {stages.map((stage) => {
                  const stageId = stage._id || stage.id;
                  const isActive = activeFilters.stageId === stageId;
                  return (
                    <button
                      key={stageId}
                      onClick={() => setStageFilter(stageId)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tags Section */}
        {currentInboxId && (
          <div className="mt-5">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                Tags
              </span>
            </div>
            {loadingTags ? (
              <div className="flex justify-center p-2">
                <span className="loading loading-spinner loading-xs text-white/30"></span>
              </div>
            ) : tags.length === 0 ? (
              <p className="text-xs text-white/30 px-2">No tags yet</p>
            ) : (
              <div className="space-y-0.5">
                {tags.map((tag) => {
                  const tagId = tag._id || tag.id;
                  const isActive = (activeFilters.tags || []).includes(tagId);
                  return (
                    <button
                      key={tagId}
                      onClick={() => toggleTagFilter(tagId)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Navigation Links */}
        {currentInboxId && (
          <div className="mt-5">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                Navigation
              </span>
            </div>
            <div className="space-y-0.5">
              <Link
                href={`/dashboard/inbox/${currentInboxId}/leads`}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:bg-white/10 hover:text-neutral-200 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                Leads
              </Link>
              <Link
                href="/dashboard/templates"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:bg-white/10 hover:text-neutral-200 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Templates
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Menu */}
      <div className="p-3 border-t border-white/10">
        <div className="space-y-0.5">
          <Link
            href="/dashboard/leads"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:bg-white/10 hover:text-neutral-200 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            All Leads
          </Link>
          {currentInboxId && (
            <Link
              href={`/dashboard/settings/team?inbox=${currentInboxId}`}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:bg-white/10 hover:text-neutral-200 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              Team
            </Link>
          )}
          <Link
            href="/dashboard/settings/emails"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:bg-white/10 hover:text-neutral-200 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </div>
    </aside>
  );
}
