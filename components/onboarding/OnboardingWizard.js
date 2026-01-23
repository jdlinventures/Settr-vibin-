"use client";

import { useState, useEffect } from "react";
import StepWelcome from "./StepWelcome";
import StepConnectEmail from "./StepConnectEmail";
import StepCreateInbox from "./StepCreateInbox";
import StepAssignEmail from "./StepAssignEmail";
import StepInviteTeam from "./StepInviteTeam";
import StepComplete from "./StepComplete";

const STEPS = [
  { id: 0, name: "Welcome", component: StepWelcome },
  { id: 1, name: "Connect Email", component: StepConnectEmail },
  { id: 2, name: "Create Inbox", component: StepCreateInbox },
  { id: 3, name: "Assign Email", component: StepAssignEmail },
  { id: 4, name: "Invite Team", component: StepInviteTeam },
  { id: 5, name: "Complete", component: StepComplete },
];

export default function OnboardingWizard({ initialStep = 0, onComplete }) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState({
    connectedEmailId: null,
    centralInboxId: null,
  });

  const updateOnboardingStep = async (step) => {
    try {
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      });
    } catch (error) {
      console.error("Failed to update onboarding step:", error);
    }
  };

  const handleNext = async (stepData = {}) => {
    // Merge any data from the step
    setData((prev) => ({ ...prev, ...stepData }));

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    await updateOnboardingStep(nextStep);

    if (nextStep >= STEPS.length - 1) {
      // Last step reached
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    // Skip to the complete step
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    await updateOnboardingStep(nextStep);
  };

  const handleComplete = async () => {
    await updateOnboardingStep(5);
    onComplete?.();
  };

  const CurrentStepComponent = STEPS[currentStep]?.component;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Progress indicator */}
      {currentStep < 5 && (
        <div className="mb-8">
          <ul className="steps steps-horizontal w-full">
            {STEPS.slice(0, -1).map((step, index) => (
              <li
                key={step.id}
                className={`step ${index <= currentStep ? "step-primary" : ""}`}
              >
                <span className="hidden sm:inline text-xs">{step.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step content */}
      <div className="bg-base-100 rounded-xl shadow-lg p-8">
        {CurrentStepComponent && (
          <CurrentStepComponent
            data={data}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            onComplete={handleComplete}
            isFirstStep={currentStep === 0}
            isLastStep={currentStep === STEPS.length - 1}
          />
        )}
      </div>
    </div>
  );
}
