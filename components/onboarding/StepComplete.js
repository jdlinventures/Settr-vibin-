"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export default function StepComplete({ data, onComplete }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti
    if (!showConfetti) {
      setShowConfetti(true);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Confetti not available
      }
    }
  }, [showConfetti]);

  return (
    <div className="text-center py-8">
      {/* Success Icon */}
      <div className="mb-6">
        <div className="w-24 h-24 mx-auto bg-success/20 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-12 h-12 text-success"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      {/* Success Message */}
      <h2 className="text-3xl font-bold mb-4">You're All Set!</h2>
      <p className="text-base-content/70 mb-8 max-w-md mx-auto">
        Your inbox is ready to go. Your emails are syncing and you can start
        managing your communications right away.
      </p>

      {/* Summary */}
      <div className="bg-base-200 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
        <h3 className="font-semibold mb-4">What's next?</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <div className="font-medium">Check your inbox</div>
              <div className="text-sm text-base-content/60">
                Your emails should start appearing soon
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <div className="font-medium">Organize with tags & stages</div>
              <div className="text-sm text-base-content/60">
                Track leads through your pipeline
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <div className="font-medium">Reply to emails</div>
              <div className="text-sm text-base-content/60">
                Send responses directly from Settr
              </div>
            </div>
          </li>
        </ul>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mb-8">
        <p className="text-sm text-base-content/60">
          Pro tip: Press <kbd className="kbd kbd-sm">?</kbd> to see keyboard
          shortcuts
        </p>
      </div>

      {/* CTA */}
      <button onClick={onComplete} className="btn btn-primary btn-lg">
        Go to Inbox
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
  );
}
