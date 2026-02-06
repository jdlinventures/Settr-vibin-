"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LeadTable from "./LeadTable";
import LeadKanban from "./LeadKanban";
import LeadDetail from "./LeadDetail";
import LeadForm from "./LeadForm";

export default function LeadsView({ centralInboxId, inboxName }) {
  const [view, setView] = useState("table"); // "table" | "kanban"
  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
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
      if (filterStage) params.set("stageId", filterStage);

      const res = await fetch(
        `/api/central-inboxes/${centralInboxId}/leads?${params}`
      );
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }, [centralInboxId, page, search, sortBy, sortDir, filterStage]);

  const fetchStages = async () => {
    try {
      const res = await fetch(`/api/central-inboxes/${centralInboxId}/stages`);
      if (res.ok) {
        const data = await res.json();
        setStages(data);
      }
    } catch (error) {
      console.error("Failed to fetch stages:", error);
    }
  };

  useEffect(() => {
    fetchStages();
  }, [centralInboxId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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
      // Refresh selected lead
      fetchLeadDetail(selectedLead.id || selectedLead._id);
    }
  };

  const fetchLeadDetail = async (leadId) => {
    try {
      const res = await fetch(
        `/api/central-inboxes/${centralInboxId}/leads/${leadId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data);
      }
    } catch (error) {
      console.error("Failed to fetch lead:", error);
    }
  };

  const handleExport = async () => {
    window.open(
      `/api/central-inboxes/${centralInboxId}/leads/export`,
      "_blank"
    );
  };

  const handleStageChange = async (leadId, newStageId) => {
    try {
      await fetch(
        `/api/central-inboxes/${centralInboxId}/leads/${leadId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stageId: newStageId }),
        }
      );
      fetchLeads();
    } catch (error) {
      console.error("Failed to update stage:", error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e5e5] px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/inbox/${centralInboxId}`}
              className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors text-neutral-400 hover:text-[#171717]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-[#171717]">Leads</h1>
              <p className="text-xs text-neutral-400">{inboxName} &middot; {total} leads</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export */}
            <button
              onClick={handleExport}
              className="px-3 py-2 text-sm border border-[#e5e5e5] rounded-lg hover:bg-[#f5f5f5] transition-colors"
            >
              Export CSV
            </button>
            {/* Add Lead */}
            <button
              onClick={() => { setEditingLead(null); setShowForm(true); }}
              className="px-4 py-2 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] transition-colors"
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

          {/* Stage Filter */}
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

          {/* View Toggle */}
          <div className="flex bg-[#f5f5f5] rounded-lg p-0.5">
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === "table"
                  ? "bg-white text-[#171717] shadow-sm"
                  : "text-neutral-500 hover:text-[#171717]"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M12 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M21.375 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M12 13.125v-1.5m0 1.5c0 .621.504 1.125 1.125 1.125M12 13.125c0 .621-.504 1.125-1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-2.25 0c-.621 0-1.125.504-1.125 1.125" />
              </svg>
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === "kanban"
                  ? "bg-white text-[#171717] shadow-sm"
                  : "text-neutral-500 hover:text-[#171717]"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </button>
          </div>
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
              <p className="text-sm mb-2">No leads yet</p>
              <button
                onClick={() => { setEditingLead(null); setShowForm(true); }}
                className="text-sm text-[#171717] underline"
              >
                Add your first lead
              </button>
            </div>
          ) : view === "table" ? (
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
            />
          ) : (
            <LeadKanban
              leads={leads}
              stages={stages}
              onSelectLead={setSelectedLead}
              onStageChange={handleStageChange}
            />
          )}
        </div>

        {/* Detail Panel */}
        {selectedLead && (
          <div className="w-full lg:w-[420px] border-l border-[#e5e5e5] bg-white overflow-y-auto">
            <LeadDetail
              lead={selectedLead}
              centralInboxId={centralInboxId}
              stages={stages}
              onClose={() => setSelectedLead(null)}
              onUpdate={handleLeadUpdate}
              onEdit={(lead) => { setEditingLead(lead); setShowForm(true); }}
            />
          </div>
        )}
      </div>

      {/* Lead Form Modal */}
      {showForm && (
        <LeadForm
          centralInboxId={centralInboxId}
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
