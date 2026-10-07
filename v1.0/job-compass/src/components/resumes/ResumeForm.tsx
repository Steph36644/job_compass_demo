'use client';

import { useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import type { Resume, ResumeStructured } from '@/lib/types';
import { ResumeSourceBar } from './ResumeSourceBar';

export interface ResumeFormValue {
  name: string;
  isPrimary: boolean;
  structured: ResumeStructured;
  originalText?: string;
}

// ===== 表单状态结构：文本域与数组字段之间做双向映射 =====
interface EducationFormState {
  school: string;
  major: string;
  degree: string;
  start: string;
  end: string;
  description: string;
}

interface ExperienceFormState {
  company: string;
  position: string;
  start: string;
  end: string;
  bulletsText: string; // 每行一条要点
}

interface ProjectFormState {
  name: string;
  role: string;
  description: string;
  technologiesText: string; // 顿号/逗号分隔
}

export function ResumeForm({
  initial, onClose, onSave,
}: {
  initial?: Resume;
  onClose: () => void;
  onSave: (data: ResumeFormValue) => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary || false);
  const [contactName, setContactName] = useState(initial?.structured.contact?.name ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.structured.contact?.phone ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.structured.contact?.email ?? '');
  const [contactLocation, setContactLocation] = useState(initial?.structured.contact?.location ?? '');
  const [originalText, setOriginalText] = useState(initial?.originalText ?? '');

  // 初始化映射：读取兜底 ?? [] / ?? ''，兼容旧存档缺字段
  const [education, setEducation] = useState<EducationFormState[]>(
    (initial?.structured.education ?? []).map((e) => ({
      school: e.school ?? '', major: e.major ?? '', degree: e.degree ?? '',
      start: e.start ?? '', end: e.end ?? '', description: e.description ?? '',
    }))
  );
  const [experiences, setExperiences] = useState<ExperienceFormState[]>(
    (initial?.structured.experiences ?? []).map((e) => ({
      company: e.company ?? '', position: e.position ?? '',
      start: e.start ?? '', end: e.end ?? '',
      bulletsText: (e.bullets ?? []).join('\n'),
    }))
  );
  const [projects, setProjects] = useState<ProjectFormState[]>(
    (initial?.structured.projects ?? []).map((p) => ({
      name: p.name ?? '', role: p.role ?? '', description: p.description ?? '',
      technologiesText: (p.technologies ?? []).join('、'),
    }))
  );
  const [skillsText, setSkillsText] = useState((initial?.structured.skills ?? []).join('、'));
  const [selfIntro, setSelfIntro] = useState(initial?.structured.selfIntro || '');

  const handleSave = () => {
    if (!name.trim()) return;
    // 保存映射：过滤完全空白段，文本域拆回数组
    const contact = {
      name: contactName.trim() || undefined,
      phone: contactPhone.trim() || undefined,
      email: contactEmail.trim() || undefined,
      location: contactLocation.trim() || undefined,
    };
    onSave({
      name,
      isPrimary,
      originalText: originalText.trim() ? originalText : undefined,
      structured: {
        contact: Object.values(contact).some(Boolean) ? contact : undefined,
        education: education
          .filter((e) => e.school.trim() || e.major.trim() || e.degree.trim() || e.description.trim())
          .map((e) => ({
            school: e.school.trim(),
            major: e.major.trim(),
            degree: e.degree.trim(),
            start: e.start || undefined,
            end: e.end || undefined,
            description: e.description.trim() || undefined,
          })),
        experiences: experiences
          .filter((e) => e.company.trim() || e.bulletsText.trim())
          .map((e) => ({
            company: e.company, position: e.position,
            start: e.start || undefined, end: e.end || undefined,
            bullets: e.bulletsText.split('\n').map((s) => s.trim()).filter(Boolean),
          })),
        projects: projects
          .filter((p) => p.name.trim() || p.description.trim())
          .map((p) => ({
            name: p.name, role: p.role || undefined, description: p.description,
            technologies: p.technologiesText ? p.technologiesText.split(/[、,，\s]+/).filter(Boolean) : undefined,
          })),
        skills: skillsText ? skillsText.split(/[、,，\s]+/).filter(Boolean) : [],
        selfIntro: selfIntro || undefined,
      },
    });
  };

  const updateAt = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number, patch: Partial<T>) =>
    setter((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const removeAt = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) =>
    setter((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h3 className="font-semibold text-gray-900 mb-4">{initial ? '编辑简历' : '新建简历'}</h3>
      {(initial?.sourceFile || initial?.parseMessage) && (
        <ResumeSourceBar source={initial.sourceFile} status={initial.parseStatus} message={initial.parseMessage} />
      )}

      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">简历名称 *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：产品经理通用版" className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 mt-6">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            设为主简历
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">联系信息</label>
          <div className="grid grid-cols-2 gap-3">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="姓名" className={inputCls} />
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="电话" className={inputCls} />
            <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="邮箱" className={inputCls} />
            <input value={contactLocation} onChange={(e) => setContactLocation(e.target.value)} placeholder="城市" className={inputCls} />
          </div>
        </div>

        {/* 教育背景 */}
        <FormSection
          title="教育背景"
          addLabel="添加一段教育"
          onAdd={() => setEducation((prev) => [...prev, { school: '', major: '', degree: '', start: '', end: '', description: '' }])}
        >
          {education.map((e, i) => (
            <SectionCard key={i} onRemove={() => removeAt(setEducation, i)}>
              <div className="grid grid-cols-2 gap-3">
                <input value={e.school} onChange={(ev) => updateAt(setEducation, i, { school: ev.target.value })} placeholder="学校" className={inputCls} />
                <input value={e.major} onChange={(ev) => updateAt(setEducation, i, { major: ev.target.value })} placeholder="专业" className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input value={e.degree} onChange={(ev) => updateAt(setEducation, i, { degree: ev.target.value })} placeholder="学历（如：本科）" className={inputCls} />
                <input value={e.start} onChange={(ev) => updateAt(setEducation, i, { start: ev.target.value })} placeholder="开始（如：2023-09）" className={inputCls} />
                <input value={e.end} onChange={(ev) => updateAt(setEducation, i, { end: ev.target.value })} placeholder="结束（如：2027-06）" className={inputCls} />
              </div>
              <textarea
                value={e.description}
                onChange={(ev) => updateAt(setEducation, i, { description: ev.target.value })}
                rows={2}
                placeholder="补充说明（课程、成绩等，选填）"
                className={`${inputCls} resize-none`}
              />
            </SectionCard>
          ))}
        </FormSection>

        {/* 实习/工作经历 */}
        <FormSection
          title="实习/工作经历"
          addLabel="添加一段经历"
          onAdd={() => setExperiences((prev) => [...prev, { company: '', position: '', start: '', end: '', bulletsText: '' }])}
        >
          {experiences.map((e, i) => (
            <SectionCard key={i} onRemove={() => removeAt(setExperiences, i)}>
              <div className="grid grid-cols-2 gap-3">
                <input value={e.company} onChange={(ev) => updateAt(setExperiences, i, { company: ev.target.value })} placeholder="公司" className={inputCls} />
                <input value={e.position} onChange={(ev) => updateAt(setExperiences, i, { position: ev.target.value })} placeholder="职位" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={e.start} onChange={(ev) => updateAt(setExperiences, i, { start: ev.target.value })} placeholder="开始（如：2025-06）" className={inputCls} />
                <input value={e.end} onChange={(ev) => updateAt(setExperiences, i, { end: ev.target.value })} placeholder="结束（如：2025-09）" className={inputCls} />
              </div>
              <textarea
                value={e.bulletsText}
                onChange={(ev) => updateAt(setExperiences, i, { bulletsText: ev.target.value })}
                rows={4}
                placeholder="经历要点，每行一条（建议量化成果）"
                className={`${inputCls} resize-none`}
              />
            </SectionCard>
          ))}
        </FormSection>

        {/* 项目经历 */}
        <FormSection
          title="项目经历"
          addLabel="添加一个项目"
          onAdd={() => setProjects((prev) => [...prev, { name: '', role: '', description: '', technologiesText: '' }])}
        >
          {projects.map((p, i) => (
            <SectionCard key={i} onRemove={() => removeAt(setProjects, i)}>
              <div className="grid grid-cols-2 gap-3">
                <input value={p.name} onChange={(ev) => updateAt(setProjects, i, { name: ev.target.value })} placeholder="项目名称" className={inputCls} />
                <input value={p.role} onChange={(ev) => updateAt(setProjects, i, { role: ev.target.value })} placeholder="角色（如：产品负责人）" className={inputCls} />
              </div>
              <textarea
                value={p.description}
                onChange={(ev) => updateAt(setProjects, i, { description: ev.target.value })}
                rows={3}
                placeholder="项目描述"
                className={`${inputCls} resize-none`}
              />
              <input value={p.technologiesText} onChange={(ev) => updateAt(setProjects, i, { technologiesText: ev.target.value })} placeholder="技术栈（用顿号或逗号分隔）" className={inputCls} />
            </SectionCard>
          ))}
        </FormSection>

        {/* 技能 */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">技能（用顿号或逗号分隔）</label>
          <input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="Axure、Figma、SQL、Excel" className={inputCls} />
        </div>

        {/* 自我评价 */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">自我评价</label>
          <textarea value={selfIntro} onChange={(e) => setSelfIntro(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>

        {(originalText || initial?.sourceFile) && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">原文</label>
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              rows={8}
              className={`${inputCls} resize-y font-mono text-xs leading-relaxed`}
            />
            <p className="text-xs text-gray-400 mt-1">解析得到的全文。没有填进上面栏目的内容都在这里，可以改。</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          {initial?.sourceFile
            ? '原件已保存在本机。关闭编辑不会删除这份简历，保存前请再核对一遍自动填入的栏目。'
            : '也可以在简历列表里上传 .docx 或 PDF，自动填入这些栏目。扫描版 PDF 读不出文字。'}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="px-5 py-2 border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-gray-50">取消</button>
          <button onClick={handleSave} disabled={!name.trim()} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

// 一节（教育/经历/项目）：动态卡片列表 + 底部「+ 添加」入口
function FormSection({
  title, addLabel, onAdd, children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{title}</label>
      <div className="space-y-3">
        {children}
        <button
          type="button"
          onClick={onAdd}
          className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />{addLabel}
        </button>
      </div>
    </div>
  );
}

// 一段卡片：右上角删除按钮
function SectionCard({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="relative border border-gray-200 rounded-lg p-3 pr-8 space-y-3 bg-gray-50/50">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"
        title="删除该段"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      {children}
    </div>
  );
}
