"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function EmailSettingsPage() {
  const searchParams = useSearchParams();
  const [connectedEmails, setConnectedEmails] = useState([]);
  const [centralInboxes, setCentralInboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [message, setMessage] = useState(null);

  // Check for success/error messages from OAuth callback
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "gmail_connected") {
      setMessage({ type: "success", text: "Gmail account connected successfully!" });
    } else if (error) {
      const errorMessages = {
        oauth_denied: "You denied access to Gmail.",
        invalid_callback: "Invalid callback. Please try again.",
        invalid_state: "Invalid state. Please try again.",
        state_mismatch: "State mismatch. Please try again.",
        state_expired: "Request expired. Please try again.",
        connection_failed: "Failed to connect. Please try again.",
      };
      setMessage({
        type: "error",
        text: errorMessages[error] || "An error occurred.",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [emailsRes, inboxesRes] = await Promise.all([
        fetch("/api/emails"),
        fetch("/api/central-inboxes"),
      ]);

      if (emailsRes.ok) {
        setConnectedEmails(await emailsRes.json());
      }
      if (inboxesRes.ok) {
        setCentralInboxes(await inboxesRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = async () => {
    setConnectingGmail(true);
    try {
      const res = await fetch("/api/emails/connect/gmail", {
        method: "POST",
      });

      if (res.ok) {
        const { authUrl } = await res.json();
        window.location.href = authUrl;
      } else {
        setMessage({ type: "error", text: "Failed to start Gmail connection." });
        setConnectingGmail(false);
      }
    } catch (error) {
      console.error("Gmail connect error:", error);
      setMessage({ type: "error", text: "Failed to connect Gmail." });
      setConnectingGmail(false);
    }
  };

  const disconnectEmail = async (id) => {
    if (!confirm("Are you sure you want to disconnect this email?")) return;

    try {
      const res = await fetch(`/api/emails/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setConnectedEmails((prev) => prev.filter((e) => (e.id || e._id) !== id));
        setMessage({ type: "success", text: "Email disconnected." });
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  const testConnection = async (id) => {
    try {
      const res = await fetch(`/api/emails/${id}/test`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.status === "connected") {
        setMessage({ type: "success", text: "Connection is healthy!" });
      } else {
        setMessage({
          type: "error",
          text: `Connection error: ${data.error || "Unknown error"}`,
        });
      }

      fetchData();
    } catch (error) {
      console.error("Test connection error:", error);
    }
  };

  const assignToInbox = async (emailId, inboxId) => {
    try {
      const res = await fetch(`/api/central-inboxes/${inboxId}/assign-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectedEmailId: emailId }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Email assigned and sync started!" });
        fetchData();
      }
    } catch (error) {
      console.error("Assign error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="loading loading-spinner loading-md text-neutral-400"></span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-[#171717] transition-colors mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back to Inbox
            </Link>
            <h1 className="text-2xl font-bold text-[#171717]">Connected Emails</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Manage your connected email accounts
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`flex items-center justify-between p-4 rounded-xl mb-6 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="p-1 hover:opacity-70 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Connect New Email */}
        <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm mb-6">
          <div className="p-6">
            <h2 className="text-base font-semibold text-[#171717] mb-4">Connect New Email</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={connectGmail}
                disabled={connectingGmail}
                className="px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#f5f5f5] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {connectingGmail ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Connect Gmail
              </button>

              <button
                onClick={() => setShowSmtpForm(!showSmtpForm)}
                className="px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm font-medium text-[#171717] hover:bg-[#f5f5f5] transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Connect SMTP/IMAP
              </button>
            </div>

            {/* SMTP Form */}
            {showSmtpForm && (
              <SmtpForm
                onSuccess={() => {
                  setShowSmtpForm(false);
                  setMessage({ type: "success", text: "Email connected!" });
                  fetchData();
                }}
                onError={(err) => setMessage({ type: "error", text: err })}
              />
            )}
          </div>
        </div>

        {/* Connected Emails List */}
        <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm">
          <div className="p-6">
            <h2 className="text-base font-semibold text-[#171717] mb-4">Your Connected Emails</h2>

            {connectedEmails.length === 0 ? (
              <p className="text-neutral-400 py-8 text-center text-sm">
                No emails connected yet. Connect your first email above.
              </p>
            ) : (
              <div className="space-y-3">
                {connectedEmails.map((email) => (
                  <div
                    key={email.id || email._id}
                    className="flex items-center justify-between p-4 bg-[#fafafa] border border-[#f0f0f0] rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          email.status === "connected"
                            ? "bg-green-500"
                            : email.status === "error"
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                      />

                      <div>
                        <div className="font-medium text-sm text-[#171717]">{email.emailAddress}</div>
                        <div className="text-xs text-neutral-500">
                          {email.provider === "gmail" ? "Gmail" : "SMTP/IMAP"}
                          {email.centralInboxId && (
                            <span className="ml-2 px-1.5 py-0.5 bg-[#171717] text-white rounded text-[10px]">
                              Assigned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Assign to inbox */}
                      {!email.centralInboxId && centralInboxes.length > 0 && (
                        <select
                          className="px-2.5 py-1.5 bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-300"
                          onChange={(e) => {
                            if (e.target.value) {
                              assignToInbox(email.id || email._id, e.target.value);
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Assign to inbox...</option>
                          {centralInboxes.map((inbox) => (
                            <option
                              key={inbox.id || inbox._id}
                              value={inbox.id || inbox._id}
                            >
                              {inbox.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={() => testConnection(email.id || email._id)}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-[#171717] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                        title="Test connection"
                      >
                        Test
                      </button>

                      <button
                        onClick={() => disconnectEmail(email.id || email._id)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="Disconnect"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// SMTP Connection Form Component
function SmtpForm({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    imapHost: "",
    imapPort: "993",
    smtpHost: "",
    smtpPort: "587",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/emails/connect/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          imapPort: parseInt(formData.imapPort),
          smtpPort: parseInt(formData.smtpPort),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess();
      } else {
        onError(data.error || "Failed to connect");
      }
    } catch (error) {
      onError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            className={inputClass}
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">
            Username
          </label>
          <input
            type="text"
            required
            className={inputClass}
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            placeholder="Usually your email"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">
            Password / App Password
          </label>
          <input
            type="password"
            required
            className={inputClass}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">
            IMAP Host
          </label>
          <input
            type="text"
            required
            className={inputClass}
            value={formData.imapHost}
            onChange={(e) =>
              setFormData({ ...formData, imapHost: e.target.value })
            }
            placeholder="imap.example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">
            IMAP Port
          </label>
          <input
            type="number"
            required
            className={inputClass}
            value={formData.imapPort}
            onChange={(e) =>
              setFormData({ ...formData, imapPort: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">
            SMTP Host
          </label>
          <input
            type="text"
            required
            className={inputClass}
            value={formData.smtpHost}
            onChange={(e) =>
              setFormData({ ...formData, smtpHost: e.target.value })
            }
            placeholder="smtp.example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">
            SMTP Port
          </label>
          <input
            type="number"
            required
            className={inputClass}
            value={formData.smtpPort}
            onChange={(e) =>
              setFormData({ ...formData, smtpPort: e.target.value })
            }
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        {loading && <span className="loading loading-spinner loading-sm"></span>}
        Connect
      </button>
    </form>
  );
}
