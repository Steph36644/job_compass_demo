// Mock AI 服务：JD 解析 + 匹配报告
// MVP 阶段用规则模拟 AI 行为，后续可替换为真实大模型调用

import type { StructuredJd, MatchReport, MatchRequirement, Resume, Application } from './types';
import { uid } from './utils';

// ===== JD 解析 =====
export async function parseJd(jdText: string): Promise<StructuredJd> {
  // 模拟网络延迟
  await new Promise((r) => setTimeout(r, 1200));

  const lines = jdText.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  // 从文本中提取公司名（通常在前几行）
  const company = extractCompany(jdText) || lines[0]?.slice(0, 20) || '未知公司';

  // 提取岗位名
  const position = extractPosition(jdText) || '未知岗位';

  // 提取城市
  const cities = extractCities(jdText);

  // 提取薪资
  const salary = extractSalary(jdText);

  // 提取学历
  const education = extractEducation(jdText);

  // 提取职责和要求
  const responsibilities: string[] = [];
  const hardRequirements: string[] = [];
  const skills: string[] = [];
  const bonusRequirements: string[] = [];

  let currentSection: 'resp' | 'req' | 'bonus' | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/岗位职责|工作职责|岗位描述|你将负责|工作内容/.test(line)) {
      currentSection = 'resp';
      continue;
    }
    if (/任职要求|岗位要求|任职资格|我们希望你|岗位需求/.test(line)) {
      currentSection = 'req';
      continue;
    }
    if (/加分项|优先考虑|有以下经验/.test(line)) {
      currentSection = 'bonus';
      continue;
    }

    if (currentSection === 'resp' && /^[•\-·\d]/.test(line)) {
      responsibilities.push(line.replace(/^[•\-·\d\.\s]+/, ''));
    } else if (currentSection === 'req' && /^[•\-·\d]/.test(line)) {
      const content = line.replace(/^[•\-·\d\.\s]+/, '');
      hardRequirements.push(content);
      // 提取技能关键词
      const skillMatches = content.match(/[\u4e00-\u9fa5A-Za-z+#.]{2,}/g);
      if (skillMatches) {
        const skillWords = skillMatches.filter((w) =>
          /[A-Z]|\+|sql|java|python|react|vue|node|产品|运营|数据|用户|增长|设计|分析|管理/.test(w)
        );
        skills.push(...skillWords);
      }
    } else if (currentSection === 'bonus' && /^[•\-·\d]/.test(line)) {
      bonusRequirements.push(line.replace(/^[•\-·\d\.\s]+/, ''));
    }
  }

  // 如果没解析到分段，把所有带符号的行都当要求
  if (responsibilities.length === 0 && hardRequirements.length === 0) {
    for (const line of lines) {
      if (/^[•\-·\d]/.test(line)) {
        hardRequirements.push(line.replace(/^[•\-·\d\.\s]+/, ''));
      }
    }
  }

  // 去重
  const uniqueSkills = [...new Set(skills)].slice(0, 15);

  return {
    company,
    position,
    cities: cities.length ? cities : undefined,
    salary: salary || undefined,
    education: education || undefined,
    responsibilities: responsibilities.length ? responsibilities : undefined,
    hardRequirements: hardRequirements.length ? hardRequirements : undefined,
    skills: uniqueSkills.length ? uniqueSkills : undefined,
    bonusRequirements: bonusRequirements.length ? bonusRequirements : undefined,
    keywords: uniqueSkills.length ? uniqueSkills.slice(0, 10) : undefined,
  };
}

function extractCompany(text: string): string | null {
  // 优先匹配带公司后缀的名称
  const suffixMatch = text.match(/([\u4e00-\u9fa5A-Za-z]{2,20}(?:科技|有限公司|集团|股份|网络|信息|软件|数据|银行|证券|基金|互联网|动力))/);
  if (suffixMatch) return suffixMatch[1];
  // 匹配"公司名 岗位名"模式：取岗位关键词之前的部分作为公司名
  const posPattern = /(.*?)(?:产品经理|产品运营|产品|运营|开发|工程师|设计师|分析师|实习生|助理|专员|管培生|顾问|经理)/;
  const posMatch = text.match(posPattern);
  if (posMatch && posMatch[1]) {
    const candidate = posMatch[1].trim();
    // 过滤掉"工作地点：北京"等前缀
    const cleaned = candidate.split(/\n/).pop()?.trim();
    if (cleaned && cleaned.length >= 2 && cleaned.length <= 12 && !/[：:]/.test(cleaned)) {
      return cleaned;
    }
  }
  return null;
}

function extractPosition(text: string): string | null {
  const m = text.match(/([\u4e00-\u9fa5A-Za-z]{2,20}(?:工程师|经理|专员|实习生|助理|分析师|运营|设计|开发|产品|管培生|顾问))/);
  return m ? m[1] : null;
}

function extractCities(text: string): string[] {
  const cities = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '苏州', '长沙', '郑州', '合肥', '重庆', '天津', '青岛', '厦门', '宁波', '无锡', '福州'];
  const found = cities.filter((c) => text.includes(c));
  return [...new Set(found)];
}

function extractSalary(text: string): string | null {
  const m = text.match(/(\d{1,2}[-–~]\d{1,2}K(?:\.\d+)?(?:·\d{1,2}薪)?|\d{1,3}万[-–~]\d{1,3}万)/);
  return m ? m[1] : null;
}

function extractEducation(text: string): string | null {
  if (/博士/.test(text)) return '博士';
  if (/硕士|研究生/.test(text)) return '硕士';
  if (/本科/.test(text)) return '本科';
  if (/大专|专科/.test(text)) return '大专';
  return null;
}

// ===== 匹配报告生成 =====
export async function generateMatchReport(
  application: Application,
  resume: Resume
): Promise<MatchReport> {
  if (!application.jdRaw?.trim()) {
    throw new Error('NO_JD');
  }
  await new Promise((r) => setTimeout(r, 2000));

  // 若投递没有结构化 JD，先从原文解析
  let jd = application.jdStructured;
  if (!jd || (!jd.hardRequirements?.length && !jd.skills?.length && !jd.responsibilities?.length)) {
    jd = await parseJd(application.jdRaw);
  }
  const jdRequirements = jd?.hardRequirements || [];
  const jdSkills = jd?.skills || [];
  const jdResp = jd?.responsibilities || [];

  const resumeText = JSON.stringify(resume.structured);
  const allRequirements: MatchRequirement[] = [];

  // 硬性要求匹配
  for (const req of jdRequirements.slice(0, 8)) {
    const matched = matchInResume(req, resumeText, resume.structured);
    allRequirements.push({
      category: 'hard',
      text: req,
      jdQuote: req,
      matchStatus: matched.status,
      resumeQuote: matched.quote,
      suggestion: matched.status !== 'matched' ? buildSuggestion(req, matched.status) : undefined,
    });
  }

  // 职责匹配
  for (const resp of jdResp.slice(0, 5)) {
    const matched = matchInResume(resp, resumeText, resume.structured);
    allRequirements.push({
      category: 'responsibility',
      text: resp,
      jdQuote: resp,
      matchStatus: matched.status,
      resumeQuote: matched.quote,
      suggestion: matched.status !== 'matched' ? buildSuggestion(resp, matched.status) : undefined,
    });
  }

  // 技能匹配
  for (const skill of jdSkills.slice(0, 8)) {
    const hasSkill = (resume.structured.skills || []).some((s) =>
      s.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(s.toLowerCase())
    );
    const quote = resume.structured.skills?.find((s) =>
      s.toLowerCase().includes(skill.toLowerCase())
    );
    allRequirements.push({
      category: 'skill',
      text: skill,
      jdQuote: skill,
      matchStatus: hasSkill ? 'matched' : 'missing',
      resumeQuote: quote,
      suggestion: hasSkill ? undefined : `建议学习「${skill}」，可通过官方文档、在线课程或项目实战掌握`,
    });
  }

  // 加分项
  for (const bonus of jd?.bonusRequirements?.slice(0, 4) || []) {
    const matched = matchInResume(bonus, resumeText, resume.structured);
    allRequirements.push({
      category: 'bonus',
      text: bonus,
      jdQuote: bonus,
      matchStatus: matched.status === 'matched' ? 'matched' : 'missing',
      resumeQuote: matched.quote,
      suggestion: matched.status !== 'matched' ? `加分项：${buildSuggestion(bonus, 'partial')}` : undefined,
    });
  }

  // 计算分数
  const total = allRequirements.length || 1;
  const matched = allRequirements.filter((r) => r.matchStatus === 'matched').length;
  const partial = allRequirements.filter((r) => r.matchStatus === 'partial').length;
  const score = Math.round(((matched + partial * 0.5) / total) * 100);

  // 缺口建议
  const gapSuggestions = allRequirements
    .filter((r) => r.matchStatus !== 'matched')
    .slice(0, 5)
    .map((r) => {
      const lower = r.text.toLowerCase();
      if (/学历|本科|硕士|博士/.test(r.text)) {
        return { type: 'direction' as const, text: r.suggestion || '' };
      }
      if (lower.includes('sql') || lower.includes('python') || lower.includes('excel') || lower.includes('数据分析')) {
        return { type: 'skill' as const, text: r.suggestion || '' };
      }
      if (/项目|经验|实习/.test(r.text)) {
        return { type: 'project' as const, text: r.suggestion || '' };
      }
      return { type: 'resume' as const, text: r.suggestion || '' };
    })
    .filter((s) => s.text);

  // 简历优化建议
  const resumeOptimizations = buildResumeOptimizations(resume, allRequirements);

  // 摘要
  const missingCount = allRequirements.filter((r) => r.matchStatus === 'missing').length;
  const summary = `综合匹配度 ${score} 分。${
    score >= 70 ? '整体匹配度较高，主要优势在于' : '匹配度有待提升，主要差距在于'
  }${allRequirements.filter((r) => r.matchStatus === 'matched').slice(0, 2).map((r) => r.text).join('、') || '核心技能'}。${
    missingCount > 0 ? `建议重点补齐${missingCount}项缺失要求。` : '建议优化表述以提升通过率。'
  }`;

  return {
    id: uid(),
    applicationId: application.id,
    resumeId: resume.id,
    score,
    summary,
    requirements: allRequirements,
    gapSuggestions,
    resumeOptimizations,
    createdAt: new Date().toISOString(),
  };
}

function matchInResume(
  req: string,
  resumeText: string,
  structured: Resume['structured']
): { status: 'matched' | 'partial' | 'missing'; quote?: string } {
  const lower = req.toLowerCase();
  // 提取关键词（去掉常见助词）
  const keywords = req
    .replace(/[的了和与及或、，。；：（）()【】\[\]]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  let hitCount = 0;
  let quote = '';

  for (const kw of keywords.slice(0, 5)) {
    if (resumeText.toLowerCase().includes(kw.toLowerCase())) {
      hitCount++;
      if (!quote) {
        // 在经历或项目中找包含该关键词的句子
        const allBullets = [
          ...(structured.experiences || []).flatMap((e) => e.bullets),
          ...(structured.projects || []).map((p) => p.description || ''),
        ];
        quote = allBullets.find((b) => b.toLowerCase().includes(kw.toLowerCase())) || kw;
      }
    }
  }

  const ratio = keywords.length ? hitCount / keywords.length : 0;
  if (ratio >= 0.6) return { status: 'matched', quote };
  if (ratio > 0) return { status: 'partial', quote };
  return { status: 'missing' };
}

function buildSuggestion(req: string, status: 'partial' | 'missing'): string {
  if (/学历|本科|硕士|博士|应届|工作经验/.test(req)) {
    return `该岗位要求「${req}」，与你的背景可能不匹配，建议评估是否调整投递方向`;
  }
  if (/项目|经验|实习/.test(req)) {
    return `要求「${req}」，建议补充相关项目经历，可参考：参与一个完整项目并沉淀可量化的成果`;
  }
  return `建议在简历中补充「${req}」相关经历，如有真实经历请用 STAR 法则量化表述`;
}

function buildResumeOptimizations(
  resume: Resume,
  requirements: MatchRequirement[]
) {
  const optimizations: MatchReport['resumeOptimizations'] = [];
  const missingSkills = requirements
    .filter((r) => r.category === 'skill' && r.matchStatus === 'missing')
    .map((r) => r.text)
    .slice(0, 3);

  if (missingSkills.length) {
    optimizations.push({
      location: '技能模块',
      current: (resume.structured.skills || []).join('、') || '（未填写）',
      suggested: [...(resume.structured.skills || []), ...missingSkills].join('、'),
      reason: `补充岗位高频技能「${missingSkills.join('、')}」，提升 ATS 关键词匹配度`,
    });
  }

  // 检查经历是否有量化数据
  const experiences = resume.structured.experiences || [];
  for (let i = 0; i < experiences.length; i++) {
    const exp = experiences[i];
    const hasMetric = exp.bullets.some((b) => /\d/.test(b));
    if (!hasMetric && exp.bullets.length) {
      optimizations.push({
        location: `${exp.company} - ${exp.position} 经历`,
        current: exp.bullets[0],
        suggested: `${exp.bullets[0]}（请补充具体数据指标，如用户量、转化率、效率提升等）`,
        reason: 'HR 6 秒扫读简历时，量化成果是核心亮点，缺乏数据难以体现能力',
      });
      break;
    }
  }

  return optimizations;
}
