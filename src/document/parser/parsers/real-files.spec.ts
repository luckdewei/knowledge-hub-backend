import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseDocx } from './docx.parser';
import { parsePdf } from './pdf.parser';
import { parsePptx } from './pptx.parser';
import { parseXlsx } from './xlsx.parser';

const TEST_FILES = join(process.cwd(), 'test-files');

function readTestFile(name: string): Buffer {
  return readFileSync(join(TEST_FILES, name));
}

function expectContainsAll(text: string, phrases: string[]) {
  const missing = phrases.filter((p) => !text.includes(p));
  expect(missing, `缺少内容: ${missing.join(' | ')}`).toEqual([]);
}

describe('parsers vs test-files', () => {
  it('test-files 覆盖 docx / pdf / pptx / xlsx', () => {
    const names = readdirSync(TEST_FILES);
    expect(names.some((n) => n.endsWith('.docx'))).toBe(true);
    expect(names.some((n) => n.endsWith('.pdf'))).toBe(true);
    expect(names.some((n) => n.endsWith('.pptx'))).toBe(true);
    expect(names.some((n) => n.endsWith('.xlsx'))).toBe(true);
  });
});

describe('parseXlsx · 员工考勤表.xlsx', () => {
  let markdown: string;

  beforeAll(async () => {
    markdown = await parseXlsx(readTestFile('员工考勤表.xlsx'));
  });

  it('输出 Markdown 表格，并保留 sheet 名', () => {
    expect(markdown).toMatch(/^## 考勤表/m);
    expect(markdown).toContain('| NO | 姓名 | 上班时间 | 下班时间 | 日期 |');
    expect(markdown).toContain('| --- | --- | --- | --- | --- |');
  });

  it('提取全部 10 名员工、200 条打卡记录', () => {
    const names = [
      '李宁',
      '刘杰',
      '卢永明',
      '张伟涛',
      '薛秉坤',
      '谢金翠',
      '张忠义',
      '刘占宗',
      '庞会总',
      '李左恩',
    ];
    expectContainsAll(markdown, names);

    const dataRows = markdown
      .split('\n')
      .filter((line) => /^\| \d+ \|/.test(line));
    expect(dataRows).toHaveLength(200);
  });

  it('日期序列值被转成 YYYY-MM-DD，而不是 Excel 序列号或 ISO 时间戳', () => {
    expect(markdown).toContain('| 1 | 李宁 | 09:04:10 | 17:45:07 | 2019-03-01 |');
    expect(markdown).toContain('| 10 | 李左恩 | 09:06:06 | 17:58:56 | 2019-03-28 |');
    expect(markdown).not.toMatch(/\|\s*43525\s*\|/);
    expect(markdown).not.toContain('T00:00:00');
  });

  it('时间单元格保持时分秒', () => {
    expect(markdown).toContain('| 1 | 李宁 | 09:04:10 | 17:45:07 |');
    expect(markdown).toContain('| 10 | 李左恩 | 09:06:06 | 17:58:56 |');
  });
});

describe('parseDocx · 梁多强_Agent开发_17601230573.docx', () => {
  let markdown: string;

  beforeAll(async () => {
    markdown = await parseDocx(
      readTestFile('梁多强_Agent开发_17601230573.docx'),
    );
  });

  it('保留简历身份与联系方式', () => {
    expectContainsAll(markdown, [
      '梁多强 - AI Agent 开发',
      '17601231111',
      'xxxxaaabbb@foxmail.com',
      '上海 · 松江区',
      '求职意向：AI Agent 开发',
    ]);
  });

  it('保留三大项目与关键指标', () => {
    expectContainsAll(markdown, [
      'Deep Research 多 Agent 调研助手',
      'Book Chat 书籍 RAG 系统',
      '对话式 BI 数据看板',
      '55.6%',
      '67.4%',
      '20/20',
      '139.224.212.216',
    ]);
  });

  it('保留工作经历与教育背景', () => {
    expectContainsAll(markdown, [
      '中国联通上海分公司',
      '上海复娱文化传播有限公司',
      '上海赛可电子商务有限公司',
      '四川工程职业技术大学',
      '计算机科学与技术',
    ]);
  });

  it('列表与加粗结构可被识别', () => {
    expect(markdown).toMatch(/^\* /m);
    expect(markdown).toContain('**个人概述**');
    expect(markdown).toContain('**专业技能**');
  });
});

describe('parsePdf · 李先生_28岁_76761.pdf', () => {
  let markdown: string;

  beforeAll(async () => {
    markdown = await parsePdf(readTestFile('李先生_28岁_76761.pdf'));
  }, 20_000);

  it('提取候选人基本信息与求职意向', () => {
    expectContainsAll(markdown, [
      '李先生',
      '算法工程师',
      '28岁',
      '1998年5月',
      '深圳',
      '九江',
    ]);
  });

  it('提取工作/项目/教育关键内容', () => {
    expectContainsAll(markdown, [
      '深圳市方特斯网络科技有限公司',
      'ERP智能采购',
      '多模态RAG',
      '医疗文档',
      '金融智能助手',
      '九江学院',
      'LangGraph',
      'DeepAgents',
    ]);
  });

  it('正文非空且覆盖多页（不应只解析封面）', () => {
    expect(markdown.length).toBeGreaterThan(4000);
    expect(markdown).toContain('自我评价');
    expect(markdown).toContain('教育经历');
  });

  it('提供 uploadImage 时按页插入图片 Markdown', async () => {
    const uploaded: string[] = [];
    const withImages = await parsePdf(readTestFile('李先生_28岁_76761.pdf'), {
      uploadImage: async (_bytes, fileName) => {
        uploaded.push(fileName);
        return `https://example.test/${fileName}`;
      },
    });

    expect(uploaded.length).toBe(9);
    for (const name of uploaded) {
      expect(withImages).toContain(`![](https://example.test/${name})`);
    }
  }, 20_000);
});

describe('parsePptx · 申论总结课.pptx', () => {
  let markdown: string;

  beforeAll(async () => {
    markdown = await parsePptx(readTestFile('申论总结课.pptx'));
  }, 20_000);

  it('按幻灯片顺序输出全部 27 页', () => {
    const slides = [...markdown.matchAll(/^## 幻灯片 (\d+)/gm)].map((m) =>
      Number(m[1]),
    );
    expect(slides).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
  });

  it('首页与末页文本准确', () => {
    expectContainsAll(markdown, [
      '24下半年申论系统班',
      '四海讲师：飞扬',
      '申论总结课（1)',
      '下课啦同学们岸上见！',
    ]);
  });

  it('核心知识点未被丢页或截断', () => {
    expectContainsAll(markdown, [
      '阅读方法',
      '三遍阅读法',
      '查找要点的原则',
      '维度归纳法本质',
      '概括题题型分类',
      '分析理解类题目',
      '仙路控股有限公司',
      '众创空间',
      'Q县干部直播带货',
      '种种‘遮蔽’',
      '比较分析',
    ]);
  });

  it('无 title 占位符时把短首段提升为三级标题，且不重复输出', () => {
    expectContainsAll(markdown, [
      '### 阅读方法',
      '### 三遍阅读法',
      '### 查找要点的原则',
      '### 下课啦同学们岸上见！',
    ]);
    expect(markdown).not.toMatch(/### 阅读方法\n+阅读方法\n/);
  });
});
