// 把简历纯文本尽量拆进现有栏目。对不上的内容仍留在原文里，不在这里丢弃。

import type { ResumeContact, ResumeFileKind, ResumeParseStatus, ResumeStructured } from './types';
import { RESUME_FILE_COPY } from './resume-file-kind';

type SectionKey = 'education' | 'experience' | 'projects' | 'skills' | 'selfIntro' | 'contact' | 'other';

interface SectionTitle {
  key: SectionKey;
  title: string;
}

interface EducationDraft {
  school: string;
  major: string;
  degree: string;
  start?: string;
  end?: string;
  description: string;
}

interface ExperienceDraft {
  company: string;
  position: string;
  start?: string;
  end?: string;
  bullets: string[];
}

interface ProjectDraft {
  name: string;
  role?: string;
  description: string;
  technologies: string[];
}

const SECTION_TITLES: SectionTitle[] = [
  { key: 'education', title: 'educational background' },
  { key: 'experience', title: 'professional experience' },
  { key: 'experience', title: 'internship experience' },
  { key: 'experience', title: 'work experience' },
  { key: 'projects', title: 'project experience' },
  { key: 'skills', title: 'technical skills' },
  { key: 'contact', title: 'personal information' },
  { key: 'experience', title: '工作与实习经历' },
  { key: 'experience', title: '实习与工作经历' },
  { key: 'experience', title: '工作/实习经历' },
  { key: 'experience', title: '实习/工作经历' },
  { key: 'selfIntro', title: 'about me' },
  { key: 'education', title: '教育背景' },
  { key: 'education', title: '教育经历' },
  { key: 'education', title: '教育经验' },
  { key: 'education', title: '学习经历' },
  { key: 'experience', title: '工作经历' },
  { key: 'experience', title: '工作经验' },
  { key: 'experience', title: '实习经历' },
  { key: 'experience', title: '实习经验' },
  { key: 'experience', title: '实践经历' },
  { key: 'experience', title: '职业经历' },
  { key: 'experience', title: '校园经历' },
  { key: 'projects', title: '项目经历' },
  { key: 'projects', title: '项目经验' },
  { key: 'projects', title: '项目实践' },
  { key: 'projects', title: '科研经历' },
  { key: 'skills', title: '专业技能' },
  { key: 'skills', title: '技能特长' },
  { key: 'skills', title: '个人技能' },
  { key: 'skills', title: '技术技能' },
  { key: 'skills', title: '技能清单' },
  { key: 'skills', title: '技能证书' },
  { key: 'selfIntro', title: '自我评价' },
  { key: 'selfIntro', title: '自我介绍' },
  { key: 'selfIntro', title: '个人总结' },
  { key: 'selfIntro', title: '个人简介' },
  { key: 'selfIntro', title: '个人评价' },
  { key: 'selfIntro', title: '个人优势' },
  { key: 'selfIntro', title: '自我描述' },
  { key: 'contact', title: '个人信息' },
  { key: 'contact', title: '基本信息' },
  { key: 'contact', title: '联系方式' },
  { key: 'other', title: '求职意向' },
  { key: 'other', title: '荣誉奖项' },
  { key: 'other', title: '获奖经历' },
  { key: 'other', title: '获奖情况' },
  { key: 'other', title: '证书资质' },
  { key: 'education', title: 'education' },
  { key: 'experience', title: 'experience' },
  { key: 'experience', title: 'internship' },
  { key: 'projects', title: 'projects' },
  { key: 'projects', title: 'project' },
  { key: 'skills', title: 'skills' },
  { key: 'skills', title: '技术栈' },
  { key: 'selfIntro', title: 'summary' },
  { key: 'selfIntro', title: 'profile' },
  { key: 'contact', title: 'contact' },
  { key: 'education', title: '教育' },
  { key: 'skills', title: '技能' },
];
SECTION_TITLES.sort((a, b) => b.title.length - a.title.length);

const EXACT_ONLY = new Set([
  'education', 'experience', 'skills', 'projects', 'project', 'profile', 'summary', 'contact', 'internship', '教育',
]);

const NO_INLINE_REST = new Set(['技术栈', 'tech', 'technologies']);

const CITIES = [
  '哈尔滨', '石家庄', '呼和浩特', '乌鲁木齐',
  '北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安', '苏州',
  '天津', '重庆', '长沙', '郑州', '青岛', '厦门', '合肥', '大连', '宁波', '福州',
  '济南', '昆明', '沈阳', '长春', '南昌', '太原', '南宁', '贵阳', '兰州', '海口',
  '香港', '澳门', '台北',
];
const CITY_SET = new Set(CITIES);

const SCHOOL_RE = /大学|学院|University|College|Institute/i;
const RANGE_RE = /((?:19|20)\d{2}(?:[ \t]*[.\-/年][ \t]*\d{1,2})?(?:[ \t]*[.\-/月][ \t]*\d{1,2})?[ \t]*[月日]?)[ \t]*[-~—–到至]+[ \t]*(至今|现在|今|present|now|(?:19|20)\d{2}(?:[ \t]*[.\-/年][ \t]*\d{1,2})?(?:[ \t]*[.\-/月][ \t]*\d{1,2})?[ \t]*[月日]?)/i;

export function structureResumeText(text: string): ResumeStructured {
  const { preamble, sections } = splitSections(text);
  const contactLines = [...preamble];
  const educationLines: string[] = [];
  const experienceLines: string[] = [];
  const projectLines: string[] = [];
  const skillLines: string[] = [];
  const introLines: string[] = [];

  for (const section of sections) {
    if (section.key === 'contact') contactLines.push(...section.lines);
    else if (section.key === 'education') educationLines.push(...section.lines);
    else if (section.key === 'experience') experienceLines.push(...section.lines);
    else if (section.key === 'projects') projectLines.push(...section.lines);
    else if (section.key === 'skills') skillLines.push(...section.lines);
    else if (section.key === 'selfIntro') introLines.push(...section.lines);
  }

  const contact = cleanContact(parseContact(contactLines));
  const education = parseEducation(educationLines);
  const experiences = parseExperiences(experienceLines);
  const projects = parseProjects(projectLines);
  const skills = parseSkills(skillLines);
  const selfIntro = introLines.map((line) => stripBullet(line)).filter(Boolean).join('\n') || undefined;

  const structured: ResumeStructured = {};
  if (contact) structured.contact = contact;
  if (education.length) structured.education = education;
  if (experiences.length) structured.experiences = experiences;
  if (projects.length) structured.projects = projects;
  if (skills.length) structured.skills = skills;
  if (selfIntro) structured.selfIntro = selfIntro;
  return structured;
}

export function summarizeStructuredParse(
  text: string,
  structured: ResumeStructured,
  kind: ResumeFileKind,
): { status: ResumeParseStatus; message: string } {
  if (!hasReadableText(text)) {
    return {
      status: 'error',
      message: kind === 'pdf' ? RESUME_FILE_COPY.noTextPdf : RESUME_FILE_COPY.noTextDocx,
    };
  }
  const sectionCount = [
    structured.education?.length,
    structured.experiences?.length,
    structured.projects?.length,
    structured.skills?.length,
  ].filter((count) => !!count).length;
  if (sectionCount >= 2) {
    return {
      status: 'success',
      message: '已提取全文，并填入能识别的栏目。请核对学校、经历和技能；没填进去的内容都留在「原文」里。',
    };
  }
  if (sectionCount === 1 || structured.selfIntro || structured.contact?.name || structured.contact?.phone || structured.contact?.email) {
    return {
      status: 'partial',
      message: '已提取全文，但只识别出一部分栏目。请对照「原文」把没填上的内容补全。',
    };
  }
  return {
    status: 'partial',
    message: '已提取全文，但没能对上常见简历栏目（教育、经历、技能等）。请根据「原文」手动填写。',
  };
}

export function resumeNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  return base || '未命名简历';
}

function hasReadableText(text: string): boolean {
  const compact = text.replace(/\s+/g, '');
  return compact.length >= 8 && /[\u4e00-\u9fffA-Za-z]/.test(compact);
}

function splitSections(text: string): { preamble: string[]; sections: Array<{ key: SectionKey; lines: string[] }> } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').replace(/\u3000/g, ' ').split('\n');
  const preamble: string[] = [];
  const sections: Array<{ key: SectionKey; lines: string[] }> = [];
  let current: { key: SectionKey; lines: string[] } | null = null;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const header = matchHeader(trimmed);
    if (header) {
      if (current) sections.push(current);
      current = { key: header.key, lines: header.rest ? [header.rest] : [] };
      continue;
    }
    if (!current) preamble.push(trimmed);
    else current.lines.push(trimmed);
  }
  if (current) sections.push(current);
  return { preamble, sections };
}

function matchHeader(line: string): { key: SectionKey; rest: string } | null {
  if (isBullet(line)) return null;
  const stripped = stripDecorations(line);
  if (!stripped || /。/.test(stripped)) return null;
  const bare = stripped.replace(/\s*[:：]\s*$/, '').trim();

  for (const { key, title } of SECTION_TITLES) {
    if (bare.toLowerCase() === title.toLowerCase()) return { key, rest: '' };
    if (EXACT_ONLY.has(title.toLowerCase()) || NO_INLINE_REST.has(title.toLowerCase())) continue;

    const colon = stripped.match(new RegExp(`^${escapeRegExp(title)}\\s*[:：]\\s*(.+)$`, 'i'));
    if (colon) {
      const rest = colon[1].trim();
      if (rest.length <= 80) return { key, rest };
    }
    const spaced = stripped.match(new RegExp(`^${escapeRegExp(title)}\\s+(\\S.*)$`, 'i'));
    if (spaced) {
      const rest = spaced[1].trim();
      if (rest.length <= 80) return { key, rest };
    }
  }
  return null;
}

function stripDecorations(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[【\[]\s*/, '')
    .replace(/\s*[】\]]$/, '')
    .replace(/^(?:[一二三四五六七八九十]+|[0-9]{1,2})[、.．)\]]\s*/, '')
    .trim();
}

function parseContact(lines: string[]): ResumeContact {
  const contact: ResumeContact = {};
  const text = lines.join('\n');
  const phone = text.match(/(?:\+?86[-\s]?)?(1[3-9](?:[ \t-]?\d){9})/);
  if (phone) contact.phone = phone[1].replace(/\D/g, '');
  const email = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (email) contact.email = email[0];
  const cities = findCities(text);
  if (cities.length) contact.location = cities.slice(0, 3).join('、');
  for (const line of lines) {
    const name = line.replace(/^(?:姓名|名字)\s*[:：]\s*/, '').trim();
    if (isPersonName(name)) {
      contact.name = name;
      break;
    }
  }
  return contact;
}

function findCities(text: string): string[] {
  const found: string[] = [];
  const alternation = CITIES.join('|');
  const labeled = new RegExp(`(?:城市|现居地?|所在地|地点|坐标|location|base)\\s*[:：]?\\s*(${alternation})`, 'gi');
  const standalone = new RegExp(`(?:^|[\\s|｜/、,，])(${alternation})(?=$|[\\s|｜/、,，])`, 'g');
  for (const match of text.matchAll(labeled)) found.push(match[1]);
  for (const match of text.matchAll(standalone)) found.push(match[1]);
  return [...new Set(found)];
}

function isPersonName(line: string): boolean {
  if (!line || line.length > 40) return false;
  if (CITY_SET.has(line)) return false;
  if (/电话|邮箱|手机|微信|email|tel|意向|简历|城市|现居|所在/i.test(line)) return false;
  if (/^[\u4e00-\u9fff]{2,6}$/.test(line)) return true;
  return /^[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,3}$/.test(line);
}

function cleanContact(contact: ResumeContact): ResumeContact | undefined {
  const next: ResumeContact = {};
  if (contact.name) next.name = contact.name;
  if (contact.phone) next.phone = contact.phone;
  if (contact.email) next.email = contact.email;
  if (contact.location) next.location = contact.location;
  return Object.keys(next).length ? next : undefined;
}

function parseEducation(lines: string[]): NonNullable<ResumeStructured['education']> {
  const entries: EducationDraft[] = [];
  let current: EducationDraft | null = null;
  const push = () => {
    if (!current) return;
    if (current.school || current.major || current.degree || current.description) entries.push(current);
    current = null;
  };
  for (const line of lines) {
    if (current && isEducationStart(line, current)) push();
    if (!current) current = { school: '', major: '', degree: '', description: '' };
    absorbEducationLine(current, line);
  }
  push();
  return entries.map((entry) => ({
    school: entry.school,
    major: entry.major,
    degree: entry.degree,
    start: entry.start,
    end: entry.end,
    description: entry.description || undefined,
  }));
}

function isEducationStart(line: string, current: EducationDraft): boolean {
  if (isBullet(line) || isDescriptionLine(line)) return false;
  const hasSchool = SCHOOL_RE.test(line);
  const hasDate = hasDateRange(line);
  if (hasSchool && current.school && !line.includes(current.school)) return true;
  if (hasDate && current.start && removeDate(line).trim().length >= 2) return true;
  return false;
}

function absorbEducationLine(entry: EducationDraft, rawLine: string) {
  const dated = takeDate(rawLine);
  if (dated.range && !entry.start) {
    entry.start = dated.range.start;
    entry.end = dated.range.end;
  }
  const line = stripBullet(dated.rest.trim());
  if (!line) return;
  const structuredLine = /[|｜]/.test(line) || SCHOOL_RE.test(line);
  if (!structuredLine && (isDescriptionLine(line) || line.length > 40)) {
    entry.description = appendText(entry.description, line);
    return;
  }
  const leftovers: string[] = [];
  for (const part of splitParts(line)) {
    const peeled = peelDegree(part);
    if (peeled.degree && !entry.degree) entry.degree = peeled.degree;
    const text = peeled.rest.trim();
    if (!text) continue;
    if (!entry.school && SCHOOL_RE.test(text)) {
      entry.school = text;
      continue;
    }
    if (!entry.major && text.length <= 30 && !isDescriptionLine(text)) {
      entry.major = text;
      continue;
    }
    leftovers.push(text);
  }
  if (leftovers.length) entry.description = appendText(entry.description, leftovers.join(' '));
}

function parseExperiences(lines: string[]): NonNullable<ResumeStructured['experiences']> {
  const entries: ExperienceDraft[] = [];
  let current: ExperienceDraft | null = null;
  const push = () => {
    if (!current) return;
    if (current.company || current.position || current.bullets.length) entries.push(current);
    current = null;
  };
  for (const line of lines) {
    if (current && isExperienceStart(line, current)) push();
    if (!current) current = { company: '', position: '', bullets: [] };
    absorbExperienceLine(current, line);
  }
  push();
  return entries.map((entry) => ({
    company: entry.company,
    position: entry.position,
    start: entry.start,
    end: entry.end,
    bullets: entry.bullets,
  }));
}

function isExperienceStart(line: string, current: ExperienceDraft): boolean {
  if (!looksLikeExperienceHeader(line)) return false;
  const hasDate = hasDateRange(line);
  if (hasDate && !current.start) return false;
  if (hasDate && current.start) return true;
  return Boolean(current.company && (current.position || current.bullets.length || current.start));
}

function looksLikeExperienceHeader(line: string): boolean {
  if (isBullet(line) || isDescriptionLine(line)) return false;
  if (hasDateRange(line)) return true;
  if (/[|｜]/.test(line) && line.length <= 60) return true;
  if (/(公司|集团|银行)/.test(line) && line.length <= 40) return true;
  const parts = splitParts(removeDate(line));
  return parts.length >= 2 && line.length <= 40 && parts.some((part) => /实习|工程师|经理|专员|助理|开发|运营|产品|设计|分析|顾问|Intern|Engineer|Manager/i.test(part));
}

function absorbExperienceLine(entry: ExperienceDraft, rawLine: string) {
  if (isBullet(rawLine)) {
    const bullet = stripBullet(rawLine);
    if (bullet) entry.bullets.push(bullet);
    return;
  }
  const dated = takeDate(rawLine);
  if (dated.range && !entry.start) {
    entry.start = dated.range.start;
    entry.end = dated.range.end;
  }
  const line = dated.rest.trim();
  if (!line) return;
  if (entry.company && (entry.start || entry.position || entry.bullets.length) && !looksLikeExperienceHeader(rawLine)) {
    entry.bullets.push(stripBullet(line));
    return;
  }
  const parts = splitParts(line).filter((part) => !isDegreeToken(part));
  if (!entry.company) {
    entry.company = parts[0] ?? '';
    if (parts.length > 1) entry.position = parts.slice(1).join(' ');
    return;
  }
  if (!entry.position && line.length <= 30) {
    entry.position = line;
    return;
  }
  entry.bullets.push(stripBullet(line));
}

function parseProjects(lines: string[]): NonNullable<ResumeStructured['projects']> {
  const entries: ProjectDraft[] = [];
  let current: ProjectDraft | null = null;
  const push = () => {
    if (!current) return;
    if (current.name || current.description) entries.push(current);
    current = null;
  };
  for (const line of lines) {
    if (current && isProjectStart(line, current)) push();
    if (!current) current = { name: '', description: '', technologies: [] };
    absorbProjectLine(current, line);
  }
  push();
  return entries.map((entry) => ({
    name: entry.name,
    role: entry.role,
    description: entry.description || undefined,
    technologies: entry.technologies.length ? [...new Set(entry.technologies)] : undefined,
  }));
}

function isProjectStart(line: string, current: ProjectDraft): boolean {
  if (isBullet(line) || isTechLine(line) || !looksLikeProjectTitle(line) || !current.name) return false;
  if (!current.description && !current.technologies.length && !/[|｜]/.test(line)) return false;
  return true;
}

function looksLikeProjectTitle(line: string): boolean {
  if (isTechLine(line) || isDescriptionLine(line)) return false;
  if (/[|｜]/.test(line) && line.length <= 60) return true;
  return line.length <= 24 && !/[。！？，,、]/.test(line);
}

function absorbProjectLine(entry: ProjectDraft, rawLine: string) {
  if (isTechLine(rawLine)) {
    entry.technologies.push(...parseSkills([rawLine.replace(/^[^:：]+[:：]\s*/, '')]));
    return;
  }
  if (!entry.name) {
    const parts = rawLine.split(/\s*[|｜]\s*/).map((part) => part.trim()).filter(Boolean);
    entry.name = parts[0] ?? '';
    if (parts[1] && looksLikeRole(parts[1])) entry.role = parts[1];
    else if (parts[1]) entry.description = appendText(entry.description, parts.slice(1).join(' '));
    if (parts.length > 2) entry.description = appendText(entry.description, parts.slice(2).join(' '));
    return;
  }
  if (!entry.role && !entry.description && looksLikeRole(rawLine)) {
    entry.role = rawLine.trim();
    return;
  }
  entry.description = appendText(entry.description, stripBullet(rawLine));
}

function parseSkills(lines: string[]): string[] {
  const skills: string[] = [];
  for (const line of lines) {
    const cleaned = stripBullet(line).replace(/^(?:技术栈|主要技术|使用技术|技术|technologies|tech stack|tech)\s*[:：]\s*/i, '');
    for (const piece of cleaned.split(/[、,，;；|｜\n]+/)) {
      let token = piece.trim();
      if (!token) continue;
      const labeled = token.match(/^[^:：]{1,12}[:：]\s*(.+)$/);
      if (labeled) token = labeled[1].trim();
      const parts = /[\u4e00-\u9fff]/.test(token) ? [token] : token.split(/\s+/);
      for (const part of parts) {
        const skill = part.trim().replace(/[。；;]+$/g, '');
        if (skill && skill.length <= 30) skills.push(skill);
      }
    }
  }
  return [...new Set(skills)];
}

function isDescriptionLine(line: string): boolean {
  return /^(主修|课程|GPA|成绩|排名|荣誉|奖项|担任|负责|通过|使用)/.test(line) || /[。！？]/.test(line);
}

function isTechLine(line: string): boolean {
  return /^(技术栈|主要技术|使用技术|技术|technologies|tech stack|tech)\s*[:：]/i.test(line);
}

function looksLikeRole(line: string): boolean {
  const text = line.trim();
  return text.length > 0 && text.length <= 20 && !/\d/.test(text) && !/[。！？，,]/.test(text);
}

function isBullet(line: string): boolean {
  return /^(?:[-•·●▪▸*]|\d+[.、)])\s*\S/.test(line.trim());
}

function stripBullet(line: string): string {
  return line.trim().replace(/^(?:[-•·●▪▸*]|\d+[.、)])\s*/, '').trim();
}

function isDegreeToken(part: string): boolean {
  return peelDegree(part).rest.trim() === '' && Boolean(peelDegree(part).degree);
}

function peelDegree(part: string): { degree?: string; rest: string } {
  const match = part.trim().match(/^(.*?)(?:\s*)(博士研究生|硕士研究生|博士|硕士|本科|学士|大专|专科|研究生|MBA|PhD|Ph\.D\.?|Bachelor|Master|Doctor)$/i);
  if (!match) return { rest: part.trim() };
  return { degree: normalizeDegree(match[2]), rest: match[1].trim() };
}

function normalizeDegree(raw: string): string {
  if (/博士|ph\.?d|doctor/i.test(raw)) return '博士';
  if (/硕士|研究生|master|mba/i.test(raw)) return '硕士';
  if (/本科|学士|bachelor/i.test(raw)) return '本科';
  if (/大专|专科/.test(raw)) return '大专';
  return raw.trim();
}

function splitParts(line: string): string[] {
  const primary = line.split(/\s*[|｜]\s*|\t+| {2,}/).map((part) => part.trim()).filter(Boolean);
  if (primary.length > 1) return primary;
  const tokens = line.split(/[ \t]+/).filter(Boolean);
  if (tokens.length >= 2 && tokens.length <= 6) return tokens;
  return primary.length ? primary : (line.trim() ? [line.trim()] : []);
}

function hasDateRange(line: string): boolean {
  return RANGE_RE.test(line);
}

function removeDate(line: string): string {
  return line.replace(RANGE_RE, ' ');
}

function takeDate(line: string): { rest: string; range?: { start?: string; end?: string } } {
  const match = line.match(RANGE_RE);
  if (!match) return { rest: line };
  return {
    rest: `${line.slice(0, match.index)} ${line.slice((match.index ?? 0) + match[0].length)}`,
    range: { start: parseEndpoint(match[1]), end: parseEndpoint(match[2]) },
  };
}

function parseEndpoint(raw: string): string | undefined {
  const text = raw.trim();
  if (/^(至今|现在|今|present|now)$/i.test(text)) return '至今';
  const match = text.match(/((?:19|20)\d{2})(?:[ \t]*[.\-/年][ \t]*(\d{1,2}))?/);
  if (!match) return undefined;
  return match[2] ? `${match[1]}-${match[2].padStart(2, '0')}` : match[1];
}

function appendText(current: string, next: string): string {
  const text = next.trim();
  if (!text) return current;
  return current ? `${current}\n${text}` : text;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
