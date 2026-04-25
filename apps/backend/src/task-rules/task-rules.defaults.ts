import { TaskRuleStatus, TaskType } from '@prisma/client';
import type { Prisma, PrismaClient } from '@prisma/client';

type TaskRuleWriter = PrismaClient | Prisma.TransactionClient;

type DefaultTaskRuleTemplate = {
  taskType: TaskType;
  label: string;
  scoreDelta: number;
  sortOrder: number;
  isPinned: boolean;
};

const DEFAULT_TASK_RULE_TEMPLATES: DefaultTaskRuleTemplate[] = [
  {
    taskType: TaskType.LIGHT,
    label: '整理餐桌',
    scoreDelta: 1,
    sortOrder: 10,
    isPinned: true,
  },
  {
    taskType: TaskType.LIGHT,
    label: '倒垃圾',
    scoreDelta: 1,
    sortOrder: 20,
    isPinned: true,
  },
  {
    taskType: TaskType.LIGHT,
    label: '收快递',
    scoreDelta: 1,
    sortOrder: 30,
    isPinned: false,
  },
  {
    taskType: TaskType.LIGHT,
    label: '摆放鞋子',
    scoreDelta: 1,
    sortOrder: 40,
    isPinned: false,
  },
  {
    taskType: TaskType.LIGHT,
    label: '擦餐桌',
    scoreDelta: 1,
    sortOrder: 50,
    isPinned: false,
  },
  {
    taskType: TaskType.LIGHT,
    label: '浇花',
    scoreDelta: 1,
    sortOrder: 60,
    isPinned: false,
  },
  {
    taskType: TaskType.LIGHT,
    label: '喂宠物',
    scoreDelta: 1,
    sortOrder: 70,
    isPinned: false,
  },
  {
    taskType: TaskType.LIGHT,
    label: '整理书包',
    scoreDelta: 1,
    sortOrder: 80,
    isPinned: false,
  },
  {
    taskType: TaskType.CORE,
    label: '洗碗',
    scoreDelta: 3,
    sortOrder: 10,
    isPinned: true,
  },
  {
    taskType: TaskType.CORE,
    label: '扫地',
    scoreDelta: 3,
    sortOrder: 20,
    isPinned: true,
  },
  {
    taskType: TaskType.CORE,
    label: '拖地',
    scoreDelta: 3,
    sortOrder: 30,
    isPinned: true,
  },
  {
    taskType: TaskType.CORE,
    label: '整理客厅',
    scoreDelta: 3,
    sortOrder: 40,
    isPinned: false,
  },
  {
    taskType: TaskType.CORE,
    label: '整理厨房台面',
    scoreDelta: 3,
    sortOrder: 50,
    isPinned: false,
  },
  {
    taskType: TaskType.CORE,
    label: '洗衣服',
    scoreDelta: 3,
    sortOrder: 60,
    isPinned: false,
  },
  {
    taskType: TaskType.CORE,
    label: '晾晒衣服',
    scoreDelta: 3,
    sortOrder: 70,
    isPinned: false,
  },
  {
    taskType: TaskType.CORE,
    label: '叠衣服',
    scoreDelta: 3,
    sortOrder: 80,
    isPinned: false,
  },
  {
    taskType: TaskType.CORE,
    label: '整理玩具和杂物',
    scoreDelta: 3,
    sortOrder: 90,
    isPinned: false,
  },
  {
    taskType: TaskType.CORE,
    label: '清洁洗手台',
    scoreDelta: 3,
    sortOrder: 100,
    isPinned: false,
  },
  {
    taskType: TaskType.EPIC,
    label: '周末大扫除',
    scoreDelta: 5,
    sortOrder: 10,
    isPinned: true,
  },
  {
    taskType: TaskType.EPIC,
    label: '清洗卫生间',
    scoreDelta: 5,
    sortOrder: 20,
    isPinned: true,
  },
  {
    taskType: TaskType.EPIC,
    label: '更换床单被套',
    scoreDelta: 5,
    sortOrder: 30,
    isPinned: false,
  },
  {
    taskType: TaskType.EPIC,
    label: '深度整理厨房',
    scoreDelta: 5,
    sortOrder: 40,
    isPinned: false,
  },
  {
    taskType: TaskType.EPIC,
    label: '冰箱清理',
    scoreDelta: 5,
    sortOrder: 50,
    isPinned: false,
  },
  {
    taskType: TaskType.EPIC,
    label: '阳台清洁',
    scoreDelta: 5,
    sortOrder: 60,
    isPinned: false,
  },
  {
    taskType: TaskType.EPIC,
    label: '窗户清洁',
    scoreDelta: 5,
    sortOrder: 70,
    isPinned: false,
  },
  {
    taskType: TaskType.EPIC,
    label: '全屋收纳整理',
    scoreDelta: 5,
    sortOrder: 80,
    isPinned: false,
  },
];

export function getDefaultTaskRuleTemplates() {
  return DEFAULT_TASK_RULE_TEMPLATES;
}

export function buildDefaultTaskRules(familyId: string) {
  return DEFAULT_TASK_RULE_TEMPLATES.map((rule) => ({
    familyId,
    taskType: rule.taskType,
    label: rule.label,
    scoreDelta: rule.scoreDelta,
    sortOrder: rule.sortOrder,
    isPinned: rule.isPinned,
    status: TaskRuleStatus.ACTIVE,
  }));
}

export async function ensureDefaultTaskRules(
  db: TaskRuleWriter,
  familyId: string,
) {
  await db.taskRule.createMany({
    data: buildDefaultTaskRules(familyId),
    skipDuplicates: true,
  });
}
