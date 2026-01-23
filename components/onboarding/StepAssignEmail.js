"use client";

import { useState, useEffect } from "react";

export default function StepAssignEmail({ data, onNext, onBack }) {
  const [connectedEmails, setConnectedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConnectedEmails();
  }, []);

  const fetchConnectedEmails = async () => {
    try {
      const res = await fetch("/api/emails");
      if (res.ok) {
        const emails = await res.json();
        setConnectedEmails(emails);

        // Check if any email is already assigned to this inbox
        const alreadyAssigned = emails.some(
          (e) => e.centralInboxId === data.centralInboxId
        );
        if (alreadyAssigned) {
          setAssigned(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (emailId) => {
    if (!data.centralInboxId) {
      setError("No inbox selected");
      return;
    }

    setAssigning(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/central-inboxes/${data.centralInboxId}/assign-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectedEmailId: emailId }),
        }
      );

      if (res.ok) {
        setAssigned(true);
        // Refresh to show updated status
        fetchConnectedEmails();
      } else {
        const responseData = await res.json();
        setError(responseData.error || "Failed to assign email");
      }
    } catch (error) {
      setError("Failed to assign email");
    } finally {
      setAssigning(false);
    }
  };

  const handleContinue = () => {
    onNext();
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
      <h2 className="text-2xl font-bold mb-2">Link Your Email to the Inbox</h2>
      <p className="text-base-content/70 mb-6">
        Assign your connected email account to this inbox. Emails will start
        syncing automatically.
      </p>

      {/* Error */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Success message */}
      {assigned && (
        <div className="alert alert-success mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Email assigned! Your emails are now syncing to your inbox.
          </span>
        </div>
      )}

      {/* Connected Emails */}
      <div className="space-y-3 mb-8">
        {connectedEmails.map((email) => {
          const isAssignedToThisInbox =
            email.centralInboxId === data.centralInboxId;
          const isAssignedElsewhere =
            email.centralInboxId && email.centralInboxId !== data.centralInboxId;

          return (
            <div
              key={email.id || email._id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                isAssignedToThisInbox
                  ? "bg-success/10 border-success/30"
                  : "bg-base-200 border-base-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {isAssignedToThisInbox ? (
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
                ) : (
                  <div
                    className={`w-3 h-3 rounded-full ${
                      email.status === "connected"
                        ? "bg-success"
                        : email.status === "error"
                        ? "bg-error"
                        : "bg-warning"
                    }`}
                  />
                )}
                <div>
                  <div className="font-medium">{email.emailAddress}</div>
                  <div className="text-sm text-base-content/60">
                    {email.provider === "gmail" ? "Gmail" : "SMTP/IMAP"}
                    {isAssignedToThisInbox && (
                      <span className="ml-2 text-success">Assigned</span>
                    )}
                    {isAssignedElsewhere && (
                      <span className="ml-2 text-warning">
                        Assigned to another inbox
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isAssignedToThisInbox && !isAssignedElsewhere && (
                <button
                  onClick={() => handleAssign(email.id || email._id)}
                  disabled={assigning}
                  className="btn btn-primary btn-sm"
                >
                  {assigning ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Assign"
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Info about syncing */}
      {assigned && (
        <div className="bg-info/10 border border-info/30 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-info flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-info">Syncing your emails</p>
              <p className="text-base-content/70 mt-1">
                Your recent emails are being imported. This may take a few
                minutes depending on the number of emails. You can continue
                setting up while this happens.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={onBack} className="btn btn-ghost">
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!assigned}
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
