"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function TeamSettingsPage() {
  const searchParams = useSearchParams();
  const inboxId = searchParams.get("inbox");

  const [inboxes, setInboxes] = useState([]);
  const [selectedInboxId, setSelectedInboxId] = useState(inboxId || "");
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchInboxes();
  }, []);

  useEffect(() => {
    if (selectedInboxId) {
      fetchTeam();
    }
  }, [selectedInboxId]);

  const fetchInboxes = async () => {
    try {
      const res = await fetch("/api/central-inboxes");
      if (res.ok) {
        const data = await res.json();
        setInboxes(data);
        if (!selectedInboxId && data.length > 0) {
          setSelectedInboxId(data[0]._id || data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch inboxes:", err);
    }
  };

  const fetchTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/central-inboxes/${selectedInboxId}/team`);
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load team");
      }
    } catch (err) {
      setError("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/central-inboxes/${selectedInboxId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setInviteEmail("");
        fetchTeam();
      } else {
        setError(data.error || "Failed to send invitation");
      }
    } catch (err) {
      setError("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(
        `/api/central-inboxes/${selectedInboxId}/team/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (res.ok) {
        fetchTeam();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update role");
      }
    } catch (err) {
      setError("Failed to update role");
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;

    try {
      const res = await fetch(
        `/api/central-inboxes/${selectedInboxId}/team/${userId}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        fetchTeam();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove member");
      }
    } catch (err) {
      setError("Failed to remove member");
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    setError("Cancel invitation not yet implemented");
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[#171717] mb-6">Team Settings</h1>

        {/* Inbox Selector */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">
            Select Inbox
          </label>
          <select
            value={selectedInboxId}
            onChange={(e) => setSelectedInboxId(e.target.value)}
            className="px-3 py-2 bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300 w-full max-w-xs"
          >
            <option value="">Select an inbox</option>
            {inboxes.map((inbox) => (
              <option key={inbox._id || inbox.id} value={inbox._id || inbox.id}>
                {inbox.name}
              </option>
            ))}
          </select>
        </div>

        {!selectedInboxId ? (
          <div className="text-neutral-400 text-sm">
            Select an inbox to manage its team
          </div>
        ) : loading ? (
          <div className="flex justify-center p-8">
            <span className="loading loading-spinner loading-md text-neutral-400"></span>
          </div>
        ) : (
          <>
            {/* Alerts */}
            {error && (
              <div className="flex items-center justify-between p-4 rounded-xl mb-4 text-sm bg-red-50 text-red-800 border border-red-200">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="p-1 hover:opacity-70">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {success && (
              <div className="flex items-center justify-between p-4 rounded-xl mb-4 text-sm bg-green-50 text-green-800 border border-green-200">
                <span>{success}</span>
                <button onClick={() => setSuccess(null)} className="p-1 hover:opacity-70">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Invite Form */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm mb-6">
              <div className="p-6">
                <h2 className="text-base font-semibold text-[#171717] mb-4">Invite Team Member</h2>
                <form onSubmit={handleInvite} className="flex gap-2 flex-wrap">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Email address"
                    className="flex-1 min-w-[200px] px-3 py-2 bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300"
                    required
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="px-3 py-2 bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-2 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {inviting ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "Invite"
                    )}
                  </button>
                </form>
                <p className="text-xs text-neutral-400 mt-3">
                  <strong className="text-neutral-500">Admin:</strong> Can manage team, tags, stages, and settings.{" "}
                  <strong className="text-neutral-500">Agent:</strong> Can view and respond to emails.
                </p>
              </div>
            </div>

            {/* Team List */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm">
              <div className="p-6">
                <h2 className="text-base font-semibold text-[#171717] mb-4">Team Members</h2>

                <div className="space-y-3">
                  {/* Owner */}
                  {team?.owner && (
                    <div className="flex items-center justify-between p-4 bg-[#fafafa] border border-[#f0f0f0] rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#171717] text-white flex items-center justify-center text-sm font-medium">
                          {(team.owner.name || team.owner.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-[#171717]">{team.owner.name || "No name"}</div>
                          <div className="text-xs text-neutral-500">
                            {team.owner.email}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-[#171717] text-white rounded text-xs font-medium">Owner</span>
                    </div>
                  )}

                  {/* Team Members */}
                  {team?.members?.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-4 bg-[#fafafa] border border-[#f0f0f0] rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center text-sm font-medium">
                          {(member.name || member.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-[#171717]">{member.name || "No name"}</div>
                          <div className="text-xs text-neutral-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.userId, e.target.value)
                          }
                          className="px-2 py-1 bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-300"
                        >
                          <option value="agent">Agent</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemove(member.userId)}
                          className="px-2 py-1 text-xs text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {team?.members?.length === 0 && !team?.pendingInvitations?.length && (
                    <p className="text-center text-neutral-400 text-sm py-6">
                      No team members yet
                    </p>
                  )}
                </div>

                {/* Pending Invitations */}
                {team?.pendingInvitations?.length > 0 && (
                  <>
                    <h3 className="font-medium text-sm text-[#171717] mt-6 mb-3">Pending Invitations</h3>
                    <div className="space-y-2">
                      {team.pendingInvitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-[#fafafa] border border-[#f0f0f0] rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-[#171717]">{inv.email}</div>
                            <span className="px-1.5 py-0.5 border border-[#e5e5e5] rounded text-[10px] text-neutral-500">{inv.role}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-400">
                              by {inv.invitedBy?.name || inv.invitedBy?.email}
                            </span>
                            <button
                              onClick={() => handleCancelInvitation(inv.id)}
                              className="px-2 py-1 text-xs text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
