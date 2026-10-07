'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { MapPin, Clock, Sparkles } from 'lucide-react';
import {
  ApplicationStatus, STATUS_LABEL, STATUS_COLOR, STATUS_BORDER_COLOR,
  type Application,
} from '@/lib/types';
import { changeStatus, getMatchReport } from '@/lib/store';
import { cn, hasJdText, relativeTime } from '@/lib/utils';

const COLUMNS: ApplicationStatus[] = [
  ApplicationStatus.PENDING,
  ApplicationStatus.APPLIED,
  ApplicationStatus.ASSESSMENT,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
  ApplicationStatus.CLOSED,
];

export function KanbanBoard({ applications }: { applications: Application[] }) {
  const draggingIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ApplicationStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    // 拖拽 id 放进 dataTransfer / ref。dragStart 里同步 setState 会重渲染卡片，
    // Chrome 会因此取消本次拖拽，drop 永远不会发生。
    draggingIdRef.current = id;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => setDraggingId(id));
  };

  const handleDragOver = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol((prev) => (prev === status ? prev : status));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 进入列内子元素也会冒出 dragleave，不能当成离开这一列
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setDragOverCol(null);
  };

  const clearDrag = () => {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    const id = draggingIdRef.current || e.dataTransfer.getData('text/plain');
    clearDrag();
    if (id) changeStatus(id, status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-6">
      {COLUMNS.map((status) => {
        const items = applications.filter((a) => a.status === status);
        return (
          <div
            key={status}
            className={cn(
              'flex-shrink-0 w-72 rounded-xl border bg-gray-50/50 flex flex-col max-h-[calc(100vh-10rem)]',
              dragOverCol === status ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200'
            )}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_COLOR[status])} />
                <span className="font-medium text-sm text-gray-700">{STATUS_LABEL[status]}</span>
              </div>
              <span className="text-xs bg-white rounded-full px-2 py-0.5 text-gray-500 border border-gray-200">
                {items.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {items.map((app) => (
                <KanbanCard
                  key={app.id}
                  app={app}
                  onDragStart={handleDragStart}
                  onDragEnd={clearDrag}
                  isDragging={draggingId === app.id}
                />
              ))}
              {items.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-6">拖拽到此</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  app, onDragStart, onDragEnd, isDragging,
}: {
  app: Application;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const report = getMatchReport(app.id);
  const score = report?.score;

  return (
    <Link
      href={`/applications/${app.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, app.id)}
      onDragEnd={onDragEnd}
      className={cn(
        'block bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-all',
        STATUS_BORDER_COLOR[app.status],
        isDragging && 'opacity-40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm text-gray-900 truncate">{app.company}</h3>
          <p className="text-xs text-gray-500 truncate mt-0.5">{app.position}</p>
        </div>
        {score !== undefined && (
          <span className={cn(
            'text-[11px] font-semibold px-1.5 py-0.5 rounded shrink-0',
            score >= 70 ? 'bg-green-50 text-green-600' : score >= 50 ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
          )}>
            {score}分
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
        {app.cities?.[0] && (
          <span className="flex items-center gap-0.5">
            <MapPin className="w-3 h-3" />{app.cities[0]}
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <Clock className="w-3 h-3" />{relativeTime(app.updatedAt)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{app.channel}</span>
        {!hasJdText(app.jdRaw) && (
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">待补 JD</span>
        )}
        {app.salary && (
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded truncate max-w-[80px]">{app.salary}</span>
        )}
        {report && (
          <span className="flex items-center gap-0.5 text-[10px] text-purple-500 ml-auto">
            <Sparkles className="w-3 h-3" />AI
          </span>
        )}
      </div>
    </Link>
  );
}
