"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, [search]);

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/templates?${params.toString()}`);
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => (t._id || t.id) !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleSave = async (templateData) => {
    try {
      const isEditing = editingTemplate?._id || editingTemplate?.id;
      const url = isEditing
        ? `/api/templates/${isEditing}`
        : "/api/templates";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });

      if (res.ok) {
        setShowEditor(false);
        setEditingTemplate(null);
        fetchTemplates();
      }
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-[#171717] transition-colors mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back to Inbox
            </Link>
            <h1 className="text-2xl font-bold text-[#171717]">Email Templates</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Create and manage reusable email templates
            </p>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowEditor(true);
            }}
            className="px-4 py-2 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Template
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full max-w-md px-3 py-2 bg-[#f5f5f5] border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-colors"
          />
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md text-neutral-400"></span>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto text-neutral-300 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-neutral-500 font-medium">No templates yet</p>
            <p className="text-neutral-400 text-sm mt-1">Create your first template to speed up email replies</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const id = template._id || template.id;
              return (
                <div
                  key={id}
                  className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => {
                    setEditingTemplate(template);
                    setShowEditor(true);
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm text-[#171717] group-hover:text-[#404040]">
                        {template.name}
                      </h3>
                      <span className="px-1.5 py-0.5 bg-[#f5f5f5] rounded text-[10px] text-neutral-500">
                        {template.category}
                      </span>
                    </div>
                    {template.subject && (
                      <p className="text-xs text-neutral-500 mb-2 truncate">
                        Subject: {template.subject}
                      </p>
                    )}
                    <div
                      className="text-xs text-neutral-400 line-clamp-3"
                      dangerouslySetInnerHTML={{
                        __html: template.bodyHtml?.replace(/<[^>]+>/g, " ").slice(0, 150) || "No content",
                      }}
                    />
                  </div>
                  <div className="px-4 py-2.5 border-t border-[#f0f0f0] flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400">
                      Used {template.usageCount || 0} times
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(id);
                      }}
                      className="p-1 text-neutral-300 hover:text-red-500 rounded transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Template Editor Modal */}
        {showEditor && (
          <TemplateEditorModal
            template={editingTemplate}
            onSave={handleSave}
            onClose={() => {
              setShowEditor(false);
              setEditingTemplate(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function TemplateEditorModal({ template, onSave, onClose }) {
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [bodyHtml, setBodyHtml] = useState(template?.bodyHtml || "");
  const [category, setCategory] = useState(template?.category || "general");
  const [variables, setVariables] = useState(template?.variables || []);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, subject, bodyHtml, category, variables });
    setSaving(false);
  };

  const addVariable = () => {
    setVariables([...variables, { key: "", label: "", defaultValue: "" }]);
  };

  const updateVariable = (index, field, value) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  const removeVariable = (index) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const insertVariable = (key) => {
    setBodyHtml((prev) => prev + `{{${key}}}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_150ms_ease-out]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col border border-[#e5e5e5]">
        {/* Header */}
        <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-[#171717]">
            {template ? "Edit Template" : "New Template"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                  Template Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Follow-up"
                  required
                  className="w-full px-3 py-2 bg-[#f5f5f5] border-0 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. outreach, follow-up"
                  className="w-full px-3 py-2 bg-[#f5f5f5] border-0 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-3 py-2 bg-[#f5f5f5] border-0 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                Body
              </label>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="Write your template body... Use {{variable_name}} for dynamic content."
                rows={8}
                className="w-full px-3 py-2 bg-[#f5f5f5] border-0 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300 resize-none font-mono"
              />
            </div>

            {/* Variables */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-neutral-500">
                  Variables
                </label>
                <button
                  type="button"
                  onClick={addVariable}
                  className="text-xs text-neutral-500 hover:text-[#171717] transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Variable
                </button>
              </div>

              {variables.length > 0 && (
                <div className="space-y-2">
                  {variables.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={v.key}
                        onChange={(e) => updateVariable(i, "key", e.target.value)}
                        placeholder="key"
                        className="flex-1 px-2 py-1.5 bg-[#f5f5f5] rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-300 font-mono"
                      />
                      <input
                        type="text"
                        value={v.label}
                        onChange={(e) => updateVariable(i, "label", e.target.value)}
                        placeholder="Label"
                        className="flex-1 px-2 py-1.5 bg-[#f5f5f5] rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-300"
                      />
                      <input
                        type="text"
                        value={v.defaultValue}
                        onChange={(e) => updateVariable(i, "defaultValue", e.target.value)}
                        placeholder="Default"
                        className="flex-1 px-2 py-1.5 bg-[#f5f5f5] rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-300"
                      />
                      <button
                        type="button"
                        onClick={() => v.key && insertVariable(v.key)}
                        className="px-2 py-1.5 text-[10px] bg-[#f0f0f0] rounded hover:bg-[#e5e5e5] transition-colors"
                        title="Insert into body"
                      >
                        Insert
                      </button>
                      <button
                        type="button"
                        onClick={() => removeVariable(i)}
                        className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#e5e5e5] flex items-center justify-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : template ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
