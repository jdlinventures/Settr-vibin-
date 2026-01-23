"use client";

import { useState, useEffect } from "react";

export default function StepCreateInbox({ data, onNext, onBack }) {
  const [inboxName, setInboxName] = useState("");
  const [existingInboxes, setExistingInboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInboxes();
  }, []);

  const fetchInboxes = async () => {
    try {
      const res = await fetch("/api/central-inboxes");
      if (res.ok) {
        const inboxes = await res.json();
        setExistingInboxes(inboxes);
      }
    } catch (error) {
      console.error("Failed to fetch inboxes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!inboxName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/central-inboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inboxName.trim() }),
      });

      if (res.ok) {
        const inbox = await res.json();
        onNext({ centralInboxId: inbox.id || inbox._id });
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create inbox");
      }
    } catch (error) {
      setError("Failed to create inbox");
    } finally {
      setCreating(false);
    }
  };

  const handleSelectExisting = (inbox) => {
    onNext({ centralInboxId: inbox.id || inbox._id });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Create Your Inbox</h2>
      <p className="text-base-content/70 mb-6">
        A central inbox collects emails from your connected accounts. Give it a
        name that represents its purpose.
      </p>

      {/* Error */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Existing Inboxes */}
      {existingInboxes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Or select an existing inbox</h3>
          <div className="space-y-2">
            {existingInboxes.map((inbox) => (
              <button
                key={inbox.id || inbox._id}
                onClick={() => handleSelectExisting(inbox)}
                className="w-full flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
                    />
                  </svg>
                  <span className="font-medium">{inbox.name}</span>
                </div>
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
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            ))}
          </div>
          <div className="divider">OR</div>
        </div>
      )}

      {/* Create New Form */}
      <form onSubmit={handleCreate}>
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-medium">Inbox Name</span>
          </label>
          <input
            type="text"
            value={inboxName}
            onChange={(e) => setInboxName(e.target.value)}
            placeholder="e.g., Sales Outreach, Lead Generation, Cold Email"
            className="input input-bordered input-lg"
            required
          />
          <label className="label">
            <span className="label-text-alt text-base-content/50">
              You can create more inboxes later for different campaigns
            </span>
          </label>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button type="button" onClick={onBack} className="btn btn-ghost">
            Back
          </button>
          <button
            type="submit"
            disabled={!inboxName.trim() || creating}
            className="btn btn-primary"
          >
            {creating && (
              <span className="loading loading-spinner loading-sm"></span>
            )}
            Create Inbox
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
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
