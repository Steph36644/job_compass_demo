// 种子数据：模拟一个正在秋招的应届生的求职数据

import type { Application, Resume, UserProfile, Notification } from './types';
import { ApplicationStatus } from './types';
import { uid } from './utils';

const NOW = new Date();
const daysAgo = (n: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const dateStr = (n: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const seedProfile: UserProfile = {
  nickname: '小林',
  school: '某985大学',
  major: '计算机科学与技术',
  degree: 2,
  graduationYear: 2027,
  targetDirections: ['产品经理', '产品运营'],
  expectedCities: ['北京', '杭州'],
  jobStage: 2,
};

export const seedResumes: Resume[] = [
  {
    id: 'resume-1',
    userId: 'demo-user',
    name: '产品经理通用版',
    isPrimary: true,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(5),
    originalText: '',
    structured: {
      education: [
        { school: '某985大学', major: '计算机科学与技术', degree: '本科', start: '2023-09', end: '2027-06' },
      ],
      experiences: [
        {
          company: '某互联网公司',
          position: '产品实习生',
          start: '2025-06',
          end: '2025-09',
          bullets: [
            '负责XX功能的需求分析与产品设计，输出PRD并推动开发上线',
            '通过用户调研收集200+反馈，优化核心流程，用户满意度提升15%',
            '协同设计、研发团队完成3个版本迭代，按时交付率100%',
          ],
        },
      ],
      projects: [
        { name: '校园二手交易小程序', role: '产品负责人', description: '从0到1设计校园二手交易平台，覆盖3000+用户' },
      ],
      skills: ['Axure', 'Figma', 'SQL', 'Excel', '用户调研', '需求分析', '数据分析'],
      selfIntro: '计算机本科，热爱产品，有1段互联网实习经历，擅长用户调研与需求拆解。',
    },
  },
];

const jd1 = `字节跳动 产品经理实习生

工作地点：北京

岗位职责：
1. 负责抖音电商相关产品功能的设计与迭代
2. 进行用户调研与数据分析，挖掘用户需求
3. 输出PRD文档，推动研发落地
4. 跟踪产品数据，持续优化用户体验

任职要求：
1. 本科及以上学历，2027届毕业生
2. 有产品相关实习经验优先
3. 熟练使用Axure/Figma等原型工具
4. 具备良好的逻辑思维与沟通能力
5. 熟悉SQL，能进行数据分析

加分项：
1. 有电商或内容产品经验
2. 有完整的产品项目经历`;

const jd2 = `阿里巴巴 产品运营实习生

工作地点：杭州

岗位职责：
1. 负责天猫XX业务的用户运营
2. 策划并执行运营活动，提升用户活跃度
3. 分析用户数据，优化运营策略
4. 协同跨部门推进项目落地

任职要求：
1. 本科及以上学历，2027届毕业生
2. 有运营相关经验优先
3. 熟练使用Excel进行数据分析
4. 具备良好的文字功底和创意能力
5. 有较强的执行力和抗压能力`;

const jd3 = `腾讯 产品经理校招

工作地点：深圳

岗位职责：
1. 负责微信XX产品的规划与设计
2. 深入分析用户行为，提出产品优化方案
3. 推动产品迭代，达成业务目标

任职要求：
1. 硕士及以上学历，计算机相关专业优先
2. 有大厂产品实习经验
3. 精通Axure/Figma
4. 具备优秀的数据分析能力，熟练使用SQL/Python
5. 有强烈的产品sense和创新精神`;

const jd4 = `美团 产品经理实习生

工作地点：北京

岗位职责：
1. 负责外卖业务产品功能设计
2. 进行竞品分析和用户研究
3. 推动项目落地并跟踪效果

任职要求：
1. 本科及以上学历
2. 有产品实习经验
3. 熟练使用Axure
4. 良好的逻辑思维和沟通能力
5. 会SQL优先`;

const jd5 = `拼多多 产品运营实习生

工作地点：上海

岗位职责：
1. 负责用户增长相关运营工作
2. 策划活动，提升新用户留存
3. 数据分析，输出运营报告

任职要求：
1. 本科及以上学历
2. 有运营经验优先
3. 熟练使用Excel
4. 有较强的数据分析能力`;

const jd6 = `网易 产品经理实习生

工作地点：杭州

岗位职责：
1. 负责游戏社区产品设计
2. 用户调研与需求分析
3. 推动功能迭代

任职要求：
1. 本科及以上学历
2. 热爱游戏，有产品思维
3. 熟练使用Figma
4. 良好的文字表达能力`;

const jd7 = `京东 产品经理校招

工作地点：北京

岗位职责：
1. 负责供应链产品规划
2. 数据分析与产品优化
3. 跨部门协作推进项目

任职要求：
1. 本科及以上学历
2. 有产品实习经验
3. 熟练使用SQL
4. 良好的逻辑思维`;

const jd8 = `快手 产品运营实习生

工作地点：北京

岗位职责：
1. 负责内容生态运营
2. 策划创作者激励活动
3. 数据分析与策略优化

任职要求：
1. 本科及以上学历
2. 有运营经验
3. 熟练使用Excel
4. 良好的沟通能力`;

export const seedApplications: Application[] = [
  {
    id: 'app-1', userId: 'demo-user', company: '字节跳动', position: '产品经理实习生',
    channel: '官网', applyDate: dateStr(12), cities: ['北京'], salary: '300-500/天',
    jdRaw: jd1, status: ApplicationStatus.INTERVIEW, resumeId: 'resume-1',
    createdAt: daysAgo(12), updatedAt: daysAgo(2),
  },
  {
    id: 'app-2', userId: 'demo-user', company: '阿里巴巴', position: '产品运营实习生',
    channel: '内推', applyDate: dateStr(10), cities: ['杭州'], salary: '250-400/天',
    jdRaw: jd2, status: ApplicationStatus.ASSESSMENT, resumeId: 'resume-1',
    createdAt: daysAgo(10), updatedAt: daysAgo(3),
  },
  {
    id: 'app-3', userId: 'demo-user', company: '腾讯', position: '产品经理校招',
    channel: '官网', applyDate: dateStr(8), cities: ['深圳'], salary: '25-35K·16薪',
    jdRaw: jd3, status: ApplicationStatus.REJECTED, resumeId: 'resume-1',
    createdAt: daysAgo(8), updatedAt: daysAgo(1),
  },
  {
    id: 'app-4', userId: 'demo-user', company: '美团', position: '产品经理实习生',
    channel: 'Boss直聘', applyDate: dateStr(6), cities: ['北京'], salary: '280-450/天',
    jdRaw: jd4, status: ApplicationStatus.APPLIED, resumeId: 'resume-1',
    createdAt: daysAgo(6), updatedAt: daysAgo(6),
  },
  {
    id: 'app-5', userId: 'demo-user', company: '拼多多', position: '产品运营实习生',
    channel: '牛客', applyDate: dateStr(5), cities: ['上海'], salary: '250-400/天',
    jdRaw: jd5, status: ApplicationStatus.APPLIED, resumeId: 'resume-1',
    createdAt: daysAgo(5), updatedAt: daysAgo(5),
  },
  {
    id: 'app-6', userId: 'demo-user', company: '网易', position: '产品经理实习生',
    channel: '官网', applyDate: dateStr(4), cities: ['杭州'], salary: '250-380/天',
    jdRaw: jd6, status: ApplicationStatus.PENDING, resumeId: 'resume-1',
    createdAt: daysAgo(4), updatedAt: daysAgo(4),
  },
  {
    id: 'app-7', userId: 'demo-user', company: '京东', position: '产品经理校招',
    channel: '内推', applyDate: dateStr(3), cities: ['北京'], salary: '20-30K·14薪',
    jdRaw: jd7, status: ApplicationStatus.PENDING, resumeId: 'resume-1',
    createdAt: daysAgo(3), updatedAt: daysAgo(3),
  },
  {
    id: 'app-8', userId: 'demo-user', company: '快手', position: '产品运营实习生',
    channel: 'Boss直聘', applyDate: dateStr(2), cities: ['北京'], salary: '260-420/天',
    jdRaw: jd8, status: ApplicationStatus.PENDING, resumeId: 'resume-1',
    createdAt: daysAgo(2), updatedAt: daysAgo(2),
  },
];

export const seedNotifications: Notification[] = [
  {
    id: uid(), userId: 'demo-user', applicationId: 'app-1', type: 1,
    title: '面试提醒', content: '字节跳动 产品经理实习生 面试将于明天 14:00 进行',
    isRead: false, createdAt: daysAgo(0),
  },
  {
    id: uid(), userId: 'demo-user', applicationId: 'app-2', type: 1,
    title: '笔试提醒', content: '阿里巴巴 产品运营实习生 笔试将于明天 19:00 开始',
    isRead: false, createdAt: daysAgo(0),
  },
  {
    id: uid(), userId: 'demo-user', applicationId: 'app-4', type: 3,
    title: '投递跟进', content: '美团 产品经理实习生 投递已7天无反馈，建议主动联系HR',
    isRead: true, createdAt: daysAgo(1),
  },
];
