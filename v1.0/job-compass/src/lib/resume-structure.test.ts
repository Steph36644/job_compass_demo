import assert from 'node:assert/strict';
import test from 'node:test';
import { structureResumeText, summarizeStructuredParse } from './resume-structure';

const MAMMOTH_STYLE = `
张三

电话：13800138000

邮箱：zhangsan@example.com

求职意向：产品经理

教育背景

北京大学 | 计算机科学与技术 | 本科 | 2020.09 - 2024.06

主修数据结构

工作经历

字节跳动 | 产品实习生 | 2024.06 - 2024.09

- 负责抖音电商需求分析，输出 PRD 并推动上线

- 收集 200+ 反馈，满意度提升 15%

阿里巴巴 | 运营实习生 | 2023.07 - 2023.09

- 策划拉新活动

项目经历

校园二手交易小程序 | 产品负责人

从 0 到 1 设计校园二手平台，覆盖 3000+ 用户

技术栈：Figma、Axure

专业技能

语言：Python、SQL

工具：Axure、Figma、Excel

自我评价

计算机本科，热爱产品，擅长需求拆解。
`;

test('按常见中文栏目拆简历，学校名不会被当成城市', () => {
  const structured = structureResumeText(MAMMOTH_STYLE);
  assert.equal(structured.contact?.name, '张三');
  assert.equal(structured.contact?.phone, '13800138000');
  assert.equal(structured.contact?.email, 'zhangsan@example.com');
  assert.equal(structured.contact?.location, undefined);

  assert.equal(structured.education?.length, 1);
  assert.deepEqual(structured.education?.[0], {
    school: '北京大学',
    major: '计算机科学与技术',
    degree: '本科',
    start: '2020-09',
    end: '2024-06',
    description: '主修数据结构',
  });

  assert.equal(structured.experiences?.length, 2);
  assert.equal(structured.experiences?.[0].company, '字节跳动');
  assert.equal(structured.experiences?.[0].position, '产品实习生');
  assert.equal(structured.experiences?.[0].start, '2024-06');
  assert.equal(structured.experiences?.[0].end, '2024-09');
  assert.deepEqual(structured.experiences?.[0].bullets, [
    '负责抖音电商需求分析，输出 PRD 并推动上线',
    '收集 200+ 反馈，满意度提升 15%',
  ]);
  assert.equal(structured.experiences?.[1].company, '阿里巴巴');

  assert.equal(structured.projects?.length, 1);
  assert.equal(structured.projects?.[0].name, '校园二手交易小程序');
  assert.equal(structured.projects?.[0].role, '产品负责人');
  assert.match(structured.projects?.[0].description ?? '', /3000\+ 用户/);
  assert.deepEqual(structured.projects?.[0].technologies, ['Figma', 'Axure']);

  assert.deepEqual(structured.skills, ['Python', 'SQL', 'Axure', 'Figma', 'Excel']);
  assert.match(structured.selfIntro ?? '', /擅长需求拆解/);
  assert.doesNotMatch(structured.selfIntro ?? '', /求职意向/);

  const summary = summarizeStructuredParse(MAMMOTH_STYLE, structured, 'docx');
  assert.equal(summary.status, 'success');
});

test('编号标题、紧凑行和至今都能识别', () => {
  const structured = structureResumeText(`
李四
现居：杭州
一、教育背景
清华大学  软件工程  硕士  2021年9月—2024年6月
二、实习经历
美团 | 产品实习生 | 2024.01 - 至今
• 优化下单流程
三、专业技能
Excel、SQL、用户调研
`);
  assert.equal(structured.contact?.name, '李四');
  assert.equal(structured.contact?.location, '杭州');
  assert.equal(structured.education?.[0].school, '清华大学');
  assert.equal(structured.education?.[0].major, '软件工程');
  assert.equal(structured.education?.[0].degree, '硕士');
  assert.equal(structured.education?.[0].start, '2021-09');
  assert.equal(structured.education?.[0].end, '2024-06');
  assert.equal(structured.experiences?.[0].company, '美团');
  assert.equal(structured.experiences?.[0].end, '至今');
  assert.deepEqual(structured.experiences?.[0].bullets, ['优化下单流程']);
  assert.deepEqual(structured.skills, ['Excel', 'SQL', '用户调研']);
});

test('英文栏目名可以拆开', () => {
  const structured = structureResumeText(`
Alex Chen
alex@example.com

Education
Peking University | Computer Science | Bachelor | 2020.09 - 2024.06

Experience
ByteDance | Product Intern | 2024.06 - 2024.09
- Wrote PRDs

Skills
SQL, Figma, Excel

Summary
CS student who likes products.
`);
  assert.equal(structured.contact?.name, 'Alex Chen');
  assert.equal(structured.contact?.email, 'alex@example.com');
  assert.equal(structured.education?.[0].school, 'Peking University');
  assert.equal(structured.education?.[0].major, 'Computer Science');
  assert.equal(structured.education?.[0].degree, '本科');
  assert.equal(structured.experiences?.[0].company, 'ByteDance');
  assert.equal(structured.experiences?.[0].position, 'Product Intern');
  assert.deepEqual(structured.experiences?.[0].bullets, ['Wrote PRDs']);
  assert.deepEqual(structured.skills, ['SQL', 'Figma', 'Excel']);
  assert.match(structured.selfIntro ?? '', /likes products/);
});

test('没有栏目时保留联系方式，并提示需要手填', () => {
  const text = '这是一段没有栏目标题的说明文字。\n联系邮箱 foo@bar.com';
  const structured = structureResumeText(text);
  assert.equal(structured.contact?.email, 'foo@bar.com');
  assert.equal(structured.education, undefined);
  const summary = summarizeStructuredParse(text, structured, 'pdf');
  assert.equal(summary.status, 'partial');
});

test('几乎没有文字时视为解析失败', () => {
  const summary = summarizeStructuredParse('   \n  ', {}, 'pdf');
  assert.equal(summary.status, 'error');
  assert.match(summary.message, /扫描件/);
});
