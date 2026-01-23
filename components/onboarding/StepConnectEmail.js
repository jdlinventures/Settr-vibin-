"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function StepConnectEmail({ data, onNext, onBack }) {
  const searchParams = useSearchParams();
  const [connectedEmails, setConnectedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [message, setMessage] = useState(null);

  // Check for OAuth callback success
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "gmail_connected") {
      setMessage({ type: "success", text: "Gmail connected successfully!" });
      fetchConnectedEmails();
    } else if (error) {
      const errorMessages = {
        oauth_denied: "You denied access to Gmail.",
        connection_failed: "Failed to connect. Please try again.",
      };
      setMessage({
        type: "error",
        text: errorMessages[error] || "An error occurred.",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    fetchConnectedEmails();
  }, []);

  const fetchConnectedEmails = async () => {
    try {
      const res = await fetch("/api/emails");
      if (res.ok) {
        const emails = await res.json();
        setConnectedEmails(emails);
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = async () => {
    setConnectingGmail(true);
    try {
      const res = await fetch("/api/emails/connect/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: "/dashboard/onboarding" }),
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

  const handleSmtpSuccess = () => {
    setShowSmtpForm(false);
    setMessage({ type: "success", text: "Email connected!" });
    fetchConnectedEmails();
  };

  const handleContinue = () => {
    if (connectedEmails.length > 0) {
      // Pass the first connected email ID
      const email = connectedEmails[0];
      onNext({ connectedEmailId: email.id || email._id });
    }
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
      <h2 className="text-2xl font-bold mb-2">Connect Your Email</h2>
      <p className="text-base-content/70 mb-6">
        Connect your email account to start receiving and sending emails through
        Settr.
      </p>

      {/* Message */}
      {message && (
        <div
          className={`alert mb-6 ${
            message.type === "success" ? "alert-success" : "alert-error"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="btn btn-ghost btn-sm btn-circle"
          >
            ✕
          </button>
        </div>
      )}

      {/* Connected Emails */}
      {connectedEmails.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Connected Accounts</h3>
          <div className="space-y-2">
            {connectedEmails.map((email) => (
              <div
                key={email.id || email._id}
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
                <span className="font-medium">{email.emailAddress}</span>
                <span className="badge badge-sm">
                  {email.provider === "gmail" ? "Gmail" : "SMTP"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Options */}
      {connectedEmails.length === 0 && (
        <div className="space-y-4 mb-6">
          {/* Gmail Option */}
          <button
            onClick={connectGmail}
            disabled={connectingGmail}
            className="w-full btn btn-lg btn-outline gap-3 justify-start"
          >
            {connectingGmail ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <div className="text-left">
              <div className="font-semibold">Connect with Gmail</div>
              <div className="text-sm text-base-content/60 font-normal">
                Recommended for Gmail users
              </div>
            </div>
          </button>

          {/* SMTP Option */}
          <button
            onClick={() => setShowSmtpForm(!showSmtpForm)}
            className="w-full btn btn-lg btn-outline gap-3 justify-start"
          >
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
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            <div className="text-left">
              <div className="font-semibold">Connect with SMTP/IMAP</div>
              <div className="text-sm text-base-content/60 font-normal">
                For other email providers
              </div>
            </div>
          </button>
        </div>
      )}

      {/* SMTP Form */}
      {showSmtpForm && (
        <div className="mb-6 p-4 bg-base-200 rounded-lg">
          <SmtpForm
            onSuccess={handleSmtpSuccess}
            onError={(err) => setMessage({ type: "error", text: err })}
            onCancel={() => setShowSmtpForm(false)}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={onBack} className="btn btn-ghost">
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={connectedEmails.length === 0}
          className="btn btn-primary"
        >
          Continue
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

// Inline SMTP Form
function SmtpForm({ onSuccess, onError, onCancel }) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold">SMTP/IMAP Configuration</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Email Address</span>
          </label>
          <input
            type="email"
            required
            className="input input-bordered input-sm"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="you@example.com"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Username</span>
          </label>
          <input
            type="text"
            required
            className="input input-bordered input-sm"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            placeholder="Usually your email"
          />
        </div>

        <div className="form-control md:col-span-2">
          <label className="label">
            <span className="label-text">Password / App Password</span>
          </label>
          <input
            type="password"
            required
            className="input input-bordered input-sm"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">IMAP Host</span>
          </label>
          <input
            type="text"
            required
            className="input input-bordered input-sm"
            value={formData.imapHost}
            onChange={(e) =>
              setFormData({ ...formData, imapHost: e.target.value })
            }
            placeholder="imap.example.com"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">IMAP Port</span>
          </label>
          <input
            type="number"
            required
            className="input input-bordered input-sm"
            value={formData.imapPort}
            onChange={(e) =>
              setFormData({ ...formData, imapPort: e.target.value })
            }
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">SMTP Host</span>
          </label>
          <input
            type="text"
            required
            className="input input-bordered input-sm"
            value={formData.smtpHost}
            onChange={(e) =>
              setFormData({ ...formData, smtpHost: e.target.value })
            }
            placeholder="smtp.example.com"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">SMTP Port</span>
          </label>
          <input
            type="number"
            required
            className="input input-bordered input-sm"
            value={formData.smtpPort}
            onChange={(e) =>
              setFormData({ ...formData, smtpPort: e.target.value })
            }
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
          {loading && <span className="loading loading-spinner loading-sm"></span>}
          Connect
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
