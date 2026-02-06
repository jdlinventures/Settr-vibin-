"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LeadTable from "./LeadTable";
import LeadDetail from "./LeadDetail";
import LeadForm from "./LeadForm";

export default function GlobalLeadsView() {
  const [leads, setLeads] = useState([]);
  const [inboxes, setInboxes] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [filterInbox, setFilterInbox] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        sortBy,
        sortDir,
      });
      if (search) params.set("search", search);
      if (filterInbox) params.set("centralInboxId", filterInbox);
      if (filterStage) params.set("stageId", filterStage);

      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
        if (data.inboxes) setInboxes(data.inboxes);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortDir, filterInbox, filterStage]);

  // Fetch stages for the selected inbox
  const fetchStages = async (inboxId) => {
    if (!inboxId) {
      setStages([]);
      return;
    }
    try {
      const res = await fetch(`/api/central-inboxes/${inboxId}/stages`);
      if (res.ok) setStages(await res.json());
    } catch (error) {
      console.error("Failed to fetch stages:", error);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchStages(filterInbox);
  }, [filterInbox]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleLeadUpdate = () => {
    fetchLeads();
    if (selectedLead) {
      const leadInbox = selectedLead.centralInboxId?._id || selectedLead.centralInboxId?.id || selectedLead.centralInboxId;
      const leadId = selectedLead.id || selectedLead._id;
      fetch(`/api/central-inboxes/${leadInbox}/leads/${leadId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setSelectedLead(data); });
    }
  };

  const handleStageChange = async (leadId, newStageId) => {
    const lead = leads.find((l) => (l.id || l._id) === leadId);
    if (!lead) return;
    const inboxId = lead.centralInboxId?._id || lead.centralInboxId?.id || lead.centralInboxId;
    try {
      await fetch(`/api/central-inboxes/${inboxId}/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: newStageId }),
      });
      fetchLeads();
    } catch (error) {
      console.error("Failed to update stage:", error);
    }
  };

  // Get the inbox ID for the selected lead (for API calls)
  const getLeadInboxId = (lead) => {
    return lead?.centralInboxId?._id || lead?.centralInboxId?.id || lead?.centralInboxId || filterInbox;
  };

  return (
    <div className="h-screen flex flex-col bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e5e5] px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors text-neutral-400 hover:text-[#171717]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-[#171717]">All Leads</h1>
              <p className="text-xs text-neutral-400">{total} leads across {inboxes.length} inboxes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingLead(null); setShowForm(true); }}
              disabled={!filterInbox}
              title={!filterInbox ? "Select an inbox first to add a lead" : ""}
              className="px-4 py-2 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] disabled:opacity-30 transition-colors"
            >
              Add Lead
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-[#f5f5f5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717]"
            />
          </div>

          {/* Inbox Filter */}
          <select
            value={filterInbox}
            onChange={(e) => { setFilterInbox(e.target.value); setFilterStage(""); setPage(1); }}
            className="px-3 py-2 bg-[#f5f5f5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717] border-0"
          >
            <option value="">All Inboxes</option>
            {inboxes.map((inbox) => (
              <option key={inbox.id} value={inbox.id}>{inbox.name}</option>
            ))}
          </select>

          {/* Stage Filter (only when inbox selected) */}
          {filterInbox && stages.length > 0 && (
            <select
              value={filterStage}
              onChange={(e) => { setFilterStage(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-[#f5f5f5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#171717] border-0"
            >
              <option value="">All Stages</option>
              {stages.map((stage) => (
                <option key={stage._id || stage.id} value={stage._id || stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`flex-1 overflow-auto ${selectedLead ? "hidden lg:block" : ""}`}>
          {loading && leads.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor" className="w-16 h-16 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p className="text-sm">No leads found</p>
            </div>
          ) : (
            <LeadTable
              leads={leads}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              onSelectLead={setSelectedLead}
              selectedLeadId={selectedLead?.id || selectedLead?._id}
              onStageChange={handleStageChange}
              stages={stages}
              page={page}
              total={total}
              onPageChange={setPage}
              showInbox
            />
          )}
        </div>

        {selectedLead && (
          <div className="w-full lg:w-[420px] border-l border-[#e5e5e5] bg-white overflow-y-auto">
            <LeadDetail
              lead={selectedLead}
              centralInboxId={getLeadInboxId(selectedLead)}
              stages={stages}
              onClose={() => setSelectedLead(null)}
              onUpdate={handleLeadUpdate}
              onEdit={(lead) => { setEditingLead(lead); setShowForm(true); }}
            />
          </div>
        )}
      </div>

      {showForm && filterInbox && (
        <LeadForm
          centralInboxId={filterInbox}
          lead={editingLead}
          stages={stages}
          onClose={() => { setShowForm(false); setEditingLead(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditingLead(null);
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}
