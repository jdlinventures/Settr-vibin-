"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function Sidebar({ onInboxChange, onFilterChange, activeFilters = {} }) {
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
    <aside className="w-64 bg-base-200 h-full flex flex-col border-r border-base-300">
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <h1 className="text-xl font-bold">Settr</h1>
      </div>

      {/* Inboxes List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <span className="text-sm font-semibold text-base-content/70">
            Inboxes
          </span>
          <button
            onClick={() => setShowNewInbox(!showNewInbox)}
            className="btn btn-ghost btn-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
        </div>

        {/* New Inbox Form */}
        {showNewInbox && (
          <form onSubmit={createInbox} className="px-2 mb-2">
            <input
              type="text"
              placeholder="Inbox name..."
              value={newInboxName}
              onChange={(e) => setNewInboxName(e.target.value)}
              className="input input-sm input-bordered w-full"
              autoFocus
            />
            <div className="flex gap-1 mt-1">
              <button type="submit" className="btn btn-primary btn-xs flex-1">
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewInbox(false)}
                className="btn btn-ghost btn-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Inbox List */}
        {loading ? (
          <div className="flex justify-center p-4">
            <span className="loading loading-spinner loading-sm"></span>
          </div>
        ) : inboxes.length === 0 ? (
          <p className="text-sm text-base-content/50 px-2">No inboxes yet</p>
        ) : (
          <ul className="menu menu-sm">
            {inboxes.map((inbox) => (
              <li key={inbox.id || inbox._id}>
                <Link
                  href={`/dashboard/inbox/${inbox.id || inbox._id}`}
                  className={
                    currentInboxId === (inbox.id || inbox._id) ? "active" : ""
                  }
                >
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
                      d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
                    />
                  </svg>
                  {inbox.name}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Stages Section */}
        {currentInboxId && (
          <div className="mt-4">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-sm font-semibold text-base-content/70">
                Stages
              </span>
            </div>
            {loadingStages ? (
              <div className="flex justify-center p-2">
                <span className="loading loading-spinner loading-xs"></span>
              </div>
            ) : stages.length === 0 ? (
              <p className="text-xs text-base-content/50 px-2">No stages</p>
            ) : (
              <ul className="menu menu-sm">
                {stages.map((stage) => {
                  const stageId = stage._id || stage.id;
                  const isActive = activeFilters.stageId === stageId;
                  return (
                    <li key={stageId}>
                      <button
                        onClick={() => setStageFilter(stageId)}
                        className={isActive ? "active" : ""}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Tags Section */}
        {currentInboxId && (
          <div className="mt-4">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-sm font-semibold text-base-content/70">
                Tags
              </span>
            </div>
            {loadingTags ? (
              <div className="flex justify-center p-2">
                <span className="loading loading-spinner loading-xs"></span>
              </div>
            ) : tags.length === 0 ? (
              <p className="text-xs text-base-content/50 px-2">No tags yet</p>
            ) : (
              <ul className="menu menu-sm">
                {tags.map((tag) => {
                  const tagId = tag._id || tag.id;
                  const isActive = (activeFilters.tags || []).includes(tagId);
                  return (
                    <li key={tagId}>
                      <button
                        onClick={() => toggleTagFilter(tagId)}
                        className={isActive ? "active" : ""}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Bottom Menu */}
      <div className="p-2 border-t border-base-300">
        <ul className="menu menu-sm">
          {currentInboxId && (
            <li>
              <Link href={`/dashboard/settings/team?inbox=${currentInboxId}`}>
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
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
                Team
              </Link>
            </li>
          )}
          <li>
            <Link href="/dashboard/settings/emails">
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
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  );
}
