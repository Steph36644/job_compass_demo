'use client';

import { useEffect, useState } from 'react';
import { Plus, FileText, Trash2, Star, Upload } from 'lucide-react';
import { useResumes } from '@/lib/use-store';
import { addResume, updateResume, deleteResume } from '@/lib/store';
import { ResumeForm, type ResumeFormValue } from '@/components/resumes/ResumeForm';
import { ResumeUploader } from '@/components/resumes/ResumeUploader';
import { ResumeSourceBar } from '@/components/resumes/ResumeSourceBar';
import type { Resume } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function ResumesPage() {
  const resumes = useResumes();
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) return;
    document.getElementById(`resume-${editingId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editingId]);

  const openCreate = () => {
    setEditingId(null);
    setShowUpload(false);
    setShowForm(true);
  };

  const openUpload = () => {
    setEditingId(null);
    setShowForm(false);
    setShowUpload(true);
  };

  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">简历中心</h1>
          <p className="text-sm text-gray-500 mt-0.5">管理多个简历版本，也可以上传 Word / PDF 自动识别</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openUpload}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />上传
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />新建简历
          </button>
        </div>
      </div>

      {showUpload && (
        <ResumeUploader
          onClose={() => setShowUpload(false)}
          onCreated={(id) => {
            setShowUpload(false);
            setShowForm(false);
            setEditingId(id);
          }}
        />
      )}

      {showForm && (
        <ResumeForm
          onClose={() => setShowForm(false)}
          onSave={(data) => {
            addResume(data);
            setShowForm(false);
          }}
        />
      )}

      {resumes.length === 0 && !showForm && !showUpload ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">还没有简历版本</p>
          <p className="text-xs text-gray-400 mt-1">可以手动新建，或上传 .docx / PDF，自动抽出文字并填入栏目</p>
          <button
            onClick={openUpload}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 inline-flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />上传 Word / PDF
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              editing={editingId === resume.id}
              onEdit={() => {
                setShowForm(false);
                setShowUpload(false);
                setEditingId(resume.id);
              }}
              onClose={() => setEditingId(null)}
              onSave={(data) => {
                updateResume(resume.id, data);
                setEditingId(null);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeCard({
  resume, editing, onEdit, onClose, onSave,
}: {
  resume: Resume;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSave: (data: ResumeFormValue) => void;
}) {
  if (editing) {
    return (
      <div id={`resume-${resume.id}`}>
        <ResumeForm initial={resume} onClose={onClose} onSave={onSave} />
      </div>
    );
  }

  const s = resume.structured;
  return (
    <div id={`resume-${resume.id}`} className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{resume.name}</h3>
              {resume.isPrimary && (
                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded">
                  <Star className="w-3 h-3 fill-current" />主简历
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              更新于 {formatDate(resume.updatedAt)}
              {s.contact?.name ? ` · ${s.contact.name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!resume.isPrimary && (
            <button onClick={() => updateResume(resume.id, { isPrimary: true })} className="px-2 py-1 text-xs text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded">
              设为主简历
            </button>
          )}
          <button onClick={onEdit} className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">编辑</button>
          <button
            onClick={() => { if (confirm('确定删除该简历？原件也会从本机删除。')) deleteResume(resume.id); }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(resume.sourceFile || resume.parseMessage) && (
        <ResumeSourceBar source={resume.sourceFile} status={resume.parseStatus} message={resume.parseMessage} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-400">教育</div>
          <div className="text-gray-700 mt-0.5">{s.education?.length || 0} 段</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">经历</div>
          <div className="text-gray-700 mt-0.5">{s.experiences?.length || 0} 段</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">项目</div>
          <div className="text-gray-700 mt-0.5">{s.projects?.length || 0} 个</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">技能</div>
          <div className="text-gray-700 mt-0.5">{s.skills?.length || 0} 项</div>
        </div>
      </div>

      {s.skills && s.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {s.skills.slice(0, 8).map((sk, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{sk}</span>
          ))}
        </div>
      )}
    </div>
  );
}
