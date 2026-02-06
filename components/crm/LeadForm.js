"use client";

import { useState } from "react";

export default function LeadForm({ centralInboxId, lead, stages, onClose, onSaved }) {
  const isEditing = !!lead;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: lead?.email || "",
    firstName: lead?.firstName || "",
    lastName: lead?.lastName || "",
    company: lead?.company || "",
    title: lead?.title || "",
    phone: lead?.phone || "",
    website: lead?.website || "",
    linkedIn: lead?.linkedIn || "",
    stageId: lead?.stageId?._id || lead?.stageId?.id || lead?.stageId || "",
    followUpDate: lead?.followUpDate ? new Date(lead.followUpDate).toISOString().split("T")[0] : "",
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const leadId = lead?.id || lead?._id;
      const url = isEditing
        ? `/api/central-inboxes/${centralInboxId}/leads/${leadId}`
        : `/api/central-inboxes/${centralInboxId}/leads`;

      const body = { ...form };
      if (!body.stageId) delete body.stageId;
      if (!body.followUpDate) delete body.followUpDate;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save lead");
        return;
      }

      onSaved?.();
    } catch (err) {
      setError("Failed to save lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-[#e5e5e5] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#171717]">
            {isEditing ? "Edit Lead" : "Add Lead"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors text-neutral-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-neutral-500 block mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              disabled={isEditing}
              placeholder="lead@company.com"
              className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717] disabled:bg-[#f5f5f5] disabled:text-neutral-400"
            />
          </div>

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">First Name</label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="John"
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Doe"
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
              />
            </div>
          </div>

          {/* Company & Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">Company</label>
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="Acme Inc"
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="CEO"
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
              />
            </div>
          </div>

          {/* Phone & Website */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 555 0123"
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">Website</label>
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="acme.com"
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label className="text-xs font-medium text-neutral-500 block mb-1">LinkedIn</label>
            <input
              type="text"
              name="linkedIn"
              value={form.linkedIn}
              onChange={handleChange}
              placeholder="linkedin.com/in/johndoe"
              className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
            />
          </div>

          {/* Stage & Follow-up */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">Stage</label>
              <select
                name="stageId"
                value={form.stageId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
              >
                <option value="">No Stage</option>
                {stages.map((stage) => (
                  <option key={stage._id || stage.id} value={stage._id || stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">Follow-up Date</label>
              <input
                type="date"
                name="followUpDate"
                value={form.followUpDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
