"use client";

import { useState } from "react";

export default function StepInviteTeam({ data, onNext, onSkip }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [inviting, setInviting] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState([]);
  const [error, setError] = useState(null);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim() || !data.centralInboxId) return;

    setInviting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/central-inboxes/${data.centralInboxId}/team`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), role }),
        }
      );

      if (res.ok) {
        setInvitedEmails((prev) => [...prev, { email: email.trim(), role }]);
        setEmail("");
        setRole("agent");
      } else {
        const responseData = await res.json();
        setError(responseData.error || "Failed to send invitation");
      }
    } catch (error) {
      setError("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleContinue = () => {
    onNext();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Invite Your Team</h2>
      <p className="text-base-content/70 mb-6">
        Work together with your team on managing emails. You can skip this step
        and invite team members later.
      </p>

      {/* Error */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-ghost btn-sm">
            ✕
          </button>
        </div>
      )}

      {/* Invited List */}
      {invitedEmails.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Invitations Sent</h3>
          <div className="space-y-2">
            {invitedEmails.map((invite, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-success/10 border border-success/30 rounded-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 text-success"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">{invite.email}</span>
                <span className="badge badge-sm badge-ghost capitalize">
                  {invite.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Form */}
      <form onSubmit={handleInvite} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="form-control flex-1">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="input input-bordered"
              required
            />
          </div>
          <div className="form-control">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="select select-bordered"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!email.trim() || inviting}
            className="btn btn-primary"
          >
            {inviting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
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
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
                Send Invite
              </>
            )}
          </button>
        </div>
        <label className="label">
          <span className="label-text-alt text-base-content/50">
            Admins can manage team members and settings. Agents can view and
            respond to emails.
          </span>
        </label>
      </form>

      {/* Benefits info */}
      <div className="bg-base-200 rounded-lg p-4 mb-8">
        <h3 className="font-semibold mb-3">Team Collaboration Features</h3>
        <ul className="space-y-2 text-sm text-base-content/70">
          <li className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-primary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            Assign emails to team members
          </li>
          <li className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-primary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            See who's working on what
          </li>
          <li className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-primary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            Get notified when assigned emails
          </li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={onSkip} className="btn btn-ghost">
          Skip for now
        </button>
        <button onClick={handleContinue} className="btn btn-primary">
          {invitedEmails.length > 0 ? "Continue" : "Skip & Continue"}
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
    </div>
  );
}
