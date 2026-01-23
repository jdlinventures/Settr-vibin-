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
        // Auto-select first inbox if none selected
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
        fetchTeam(); // Refresh team list
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
    // TODO: Implement cancel invitation endpoint
    setError("Cancel invitation not yet implemented");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Team Settings</h1>

      {/* Inbox Selector */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text">Select Inbox</span>
        </label>
        <select
          value={selectedInboxId}
          onChange={(e) => setSelectedInboxId(e.target.value)}
          className="select select-bordered w-full max-w-xs"
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
        <div className="text-base-content/50">
          Select an inbox to manage its team
        </div>
      ) : loading ? (
        <div className="flex justify-center p-8">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      ) : (
        <>
          {/* Alerts */}
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="btn btn-sm btn-ghost">
                ×
              </button>
            </div>
          )}
          {success && (
            <div className="alert alert-success mb-4">
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="btn btn-sm btn-ghost">
                ×
              </button>
            </div>
          )}

          {/* Invite Form */}
          <div className="card bg-base-200 mb-6">
            <div className="card-body">
              <h2 className="card-title text-lg">Invite Team Member</h2>
              <form onSubmit={handleInvite} className="flex gap-2 flex-wrap">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email address"
                  className="input input-bordered flex-1 min-w-[200px]"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="select select-bordered"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn btn-primary"
                >
                  {inviting ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Invite"
                  )}
                </button>
              </form>
              <p className="text-sm text-base-content/50 mt-2">
                <strong>Admin:</strong> Can manage team, tags, stages, and settings.{" "}
                <strong>Agent:</strong> Can view and respond to emails.
              </p>
            </div>
          </div>

          {/* Team List */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-lg">Team Members</h2>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Owner */}
                    {team?.owner && (
                      <tr>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar placeholder">
                              <div className="bg-primary text-primary-content rounded-full w-10">
                                <span>
                                  {(team.owner.name || team.owner.email || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">{team.owner.name || "No name"}</div>
                              <div className="text-sm text-base-content/50">
                                {team.owner.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-primary">Owner</span>
                        </td>
                        <td>—</td>
                      </tr>
                    )}

                    {/* Team Members */}
                    {team?.members?.map((member) => (
                      <tr key={member.userId}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar placeholder">
                              <div className="bg-neutral text-neutral-content rounded-full w-10">
                                <span>
                                  {(member.name || member.email || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">{member.name || "No name"}</div>
                              <div className="text-sm text-base-content/50">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(member.userId, e.target.value)
                            }
                            className="select select-sm select-bordered"
                          >
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <button
                            onClick={() => handleRemove(member.userId)}
                            className="btn btn-ghost btn-sm text-error"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}

                    {team?.members?.length === 0 && !team?.pendingInvitations?.length && (
                      <tr>
                        <td colSpan={3} className="text-center text-base-content/50">
                          No team members yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pending Invitations */}
              {team?.pendingInvitations?.length > 0 && (
                <>
                  <h3 className="font-medium mt-6 mb-2">Pending Invitations</h3>
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Invited By</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.pendingInvitations.map((inv) => (
                          <tr key={inv.id}>
                            <td>{inv.email}</td>
                            <td>
                              <span className="badge badge-outline">{inv.role}</span>
                            </td>
                            <td>{inv.invitedBy?.name || inv.invitedBy?.email}</td>
                            <td>
                              <button
                                onClick={() => handleCancelInvitation(inv.id)}
                                className="btn btn-ghost btn-sm text-error"
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
