"use client";

import { useState } from "react";

function KanbanCard({ lead, onSelect, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("leadId", lead.id || lead._id);
        onDragStart?.(lead);
      }}
      onClick={() => onSelect(lead)}
      className="bg-white border border-[#e5e5e5] rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-medium text-neutral-600">
            {(lead.firstName || lead.email || "?").charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-[#171717] truncate">
          {lead.firstName || lead.lastName
            ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
            : lead.email}
        </span>
      </div>
      {lead.company && (
        <p className="text-[11px] text-neutral-400 ml-8 truncate">{lead.company}</p>
      )}
      <p className="text-[11px] text-neutral-400 ml-8 truncate">{lead.email}</p>
      {lead.followUpDate && new Date(lead.followUpDate) <= new Date() && (
        <div className="mt-2 ml-8 flex items-center gap-1 text-[10px] text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Follow-up due
        </div>
      )}
      {lead.tags?.length > 0 && (
        <div className="mt-2 ml-8 flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map((tag) => (
            <span
              key={tag._id || tag.id}
              className="px-1.5 py-0.5 rounded text-[9px] font-medium"
              style={{
                backgroundColor: `${tag.color}15`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeadKanban({ leads, stages, onSelectLead, onStageChange }) {
  const [dragOverStage, setDragOverStage] = useState(null);

  // Group leads by stage
  const grouped = {};
  const noStage = [];

  for (const lead of leads) {
    const stageId = lead.stageId?._id || lead.stageId?.id || lead.stageId;
    if (stageId && typeof stageId === "string") {
      if (!grouped[stageId]) grouped[stageId] = [];
      grouped[stageId].push(lead);
    } else if (stageId && typeof stageId === "object") {
      const sid = stageId._id || stageId.id;
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(lead);
    } else {
      noStage.push(lead);
    }
  }

  const handleDrop = (e, stageId) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) {
      onStageChange(leadId, stageId);
    }
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  return (
    <div className="flex gap-4 p-4 h-full overflow-x-auto">
      {/* Unassigned column */}
      <div
        className={`flex-shrink-0 w-72 flex flex-col rounded-xl transition-colors ${
          dragOverStage === "none" ? "bg-[#e5e5e5]" : "bg-[#f5f5f5]"
        }`}
        onDrop={(e) => handleDrop(e, null)}
        onDragOver={(e) => handleDragOver(e, "none")}
        onDragLeave={() => setDragOverStage(null)}
      >
        <div className="px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">
            No Stage
          </span>
          <span className="text-[10px] text-neutral-400 bg-white px-1.5 py-0.5 rounded-full">
            {noStage.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
          {noStage.map((lead) => (
            <KanbanCard
              key={lead.id || lead._id}
              lead={lead}
              onSelect={onSelectLead}
            />
          ))}
        </div>
      </div>

      {/* Stage columns */}
      {stages.map((stage) => {
        const stageId = stage._id || stage.id;
        const stageLeads = grouped[stageId] || [];

        return (
          <div
            key={stageId}
            className={`flex-shrink-0 w-72 flex flex-col rounded-xl transition-colors ${
              dragOverStage === stageId ? "bg-[#e5e5e5]" : "bg-[#f5f5f5]"
            }`}
            onDrop={(e) => handleDrop(e, stageId)}
            onDragOver={(e) => handleDragOver(e, stageId)}
            onDragLeave={() => setDragOverStage(null)}
          >
            <div className="px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-xs font-medium text-[#171717]">
                  {stage.name}
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 bg-white px-1.5 py-0.5 rounded-full">
                {stageLeads.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
              {stageLeads.map((lead) => (
                <KanbanCard
                  key={lead.id || lead._id}
                  lead={lead}
                  onSelect={onSelectLead}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
