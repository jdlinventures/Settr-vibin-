"use client";

import { format } from "date-fns";

function SortIcon({ field, sortBy, sortDir }) {
  if (sortBy !== field) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-neutral-300">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-[#171717]">
      <path strokeLinecap="round" strokeLinejoin="round" d={sortDir === "asc" ? "M4.5 15.75l7.5-7.5 7.5 7.5" : "M19.5 8.25l-7.5 7.5-7.5-7.5"} />
    </svg>
  );
}

export default function LeadTable({
  leads,
  sortBy,
  sortDir,
  onSort,
  onSelectLead,
  selectedLeadId,
  onStageChange,
  stages,
  page,
  total,
  onPageChange,
  showInbox,
}) {
  const totalPages = Math.ceil(total / 50);

  const columns = [
    { key: "email", label: "Contact" },
    { key: "company", label: "Company" },
    ...(showInbox ? [{ key: "centralInboxId", label: "Inbox" }] : []),
    { key: "stageId", label: "Stage" },
    { key: "lastContactedAt", label: "Last Contact" },
    { key: "followUpDate", label: "Follow-up" },
    { key: "source", label: "Source" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#fafafa] z-10">
            <tr className="border-b border-[#e5e5e5]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => onSort(col.key)}
                  className="px-4 py-3 text-left text-[11px] font-medium text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-[#171717] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon field={col.key} sortBy={sortBy} sortDir={sortDir} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const leadId = lead.id || lead._id;
              const isSelected = selectedLeadId === leadId;
              return (
                <tr
                  key={leadId}
                  onClick={() => onSelectLead(lead)}
                  className={`border-b border-[#f0f0f0] cursor-pointer transition-colors ${
                    isSelected ? "bg-[#f5f5f5]" : "hover:bg-[#fafafa]"
                  }`}
                >
                  {/* Contact */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-neutral-600">
                          {(lead.firstName || lead.email || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#171717] truncate">
                          {lead.firstName || lead.lastName
                            ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
                            : lead.email}
                        </div>
                        {(lead.firstName || lead.lastName) && (
                          <div className="text-[11px] text-neutral-400 truncate">
                            {lead.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-neutral-600">
                      {lead.company || "—"}
                    </span>
                  </td>

                  {/* Inbox (global view only) */}
                  {showInbox && (
                    <td className="px-4 py-3">
                      <span className="text-xs text-neutral-500">
                        {lead.centralInboxId?.name || "—"}
                      </span>
                    </td>
                  )}

                  {/* Stage */}
                  <td className="px-4 py-3">
                    {lead.stageId ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${lead.stageId.color}15`,
                          color: lead.stageId.color,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: lead.stageId.color }}
                        />
                        {lead.stageId.name}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-300">—</span>
                    )}
                  </td>

                  {/* Last Contact */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-neutral-500">
                      {lead.lastContactedAt
                        ? format(new Date(lead.lastContactedAt), "MMM d, yyyy")
                        : "—"}
                    </span>
                  </td>

                  {/* Follow-up */}
                  <td className="px-4 py-3">
                    {lead.followUpDate ? (
                      <span
                        className={`text-xs ${
                          new Date(lead.followUpDate) <= new Date()
                            ? "text-red-500 font-medium"
                            : "text-neutral-500"
                        }`}
                      >
                        {format(new Date(lead.followUpDate), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-300">—</span>
                    )}
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3">
                    <span className="text-[11px] text-neutral-400 capitalize">
                      {lead.source?.replace("_", " ") || "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[#e5e5e5] bg-white flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            Page {page} of {totalPages} ({total} leads)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border border-[#e5e5e5] rounded-lg hover:bg-[#f5f5f5] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border border-[#e5e5e5] rounded-lg hover:bg-[#f5f5f5] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
