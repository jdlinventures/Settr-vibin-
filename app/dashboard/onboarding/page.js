"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initialStep, setInitialStep] = useState(0);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const res = await fetch("/api/onboarding");
      if (res.ok) {
        const data = await res.json();
        if (data.completed) {
          // Already completed, redirect to dashboard
          router.push("/dashboard");
          return;
        }
        setInitialStep(data.step);
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <OnboardingWizard initialStep={initialStep} onComplete={handleComplete} />
    </div>
  );
}
