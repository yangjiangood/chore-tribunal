import { Injectable, Logger } from '@nestjs/common';
import {
  EventStatus,
  Prisma,
  TaskType,
  VerdictSource,
  VerdictStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { BoardService } from '../board/board.service';
import { getWeekIdForTimezone } from '../common/utils/week.util';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { GenerateVerdictDto } from './dto/generate-verdict.dto';

type StyleProfile = {
  toxicityLevel: number;
  allowAttack: boolean;
  allowHumiliation: boolean;
  allowLabeling: boolean;
};

type MemberWeeklyStats = {
  memberId: string;
  nickname: string;
  totalScore: number;
  lightCount: number;
  coreCount: number;
  epicCount: number;
};

type LastWeekResult = {
  championMemberId: string | null;
  lastMemberId: string | null;
  championStreak: number;
  lastPlaceStreak: number;
  memberDeltaSummary: Array<{
    memberId: string;
    totalScoreDelta: number;
    epicTaskDelta: number;
    lightTaskDelta: number;
  }>;
} | null;

type WeeklyStatsPayload = {
  weekId: string;
  championMemberId: string | null;
  lastMemberId: string | null;
  totalEvents: number;
  totalScore: number;
  taskTypeDistribution: Record<TaskType, number>;
  members: MemberWeeklyStats[];
  lastWeekResult: LastWeekResult;
};

type VerdictGenerationPayload = {
  verdictId: string;
  weekId: string;
  status: VerdictStatus;
  source: VerdictSource;
  content: string;
  generatedAt: Date;
  safetyStatus: string | null;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
};

type ProviderConfig = {
  provider: string;
  baseUrl: string | null;
  apiKey: string | null;
  model: string | null;
};

const REQUIRED_SECTIONS = [
  '本周数据总览',
  '冠军表彰',
  '垫底调侃',
  '奖惩建议',
  '暖心结语',
] as const;

function parseWeekId(weekId: string) {
  const match = /^(?<year>\d{4})-W(?<week>\d{2})$/.exec(weekId);

  if (!match?.groups) {
    return null;
  }

  return {
    year: Number(match.groups.year),
    week: Number(match.groups.week),
  };
}

function getWeekStartDate(weekId: string) {
  const parsed = parseWeekId(weekId);

  if (!parsed) {
    return null;
  }

  const januaryFourth = new Date(Date.UTC(parsed.year, 0, 4));
  const day = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);

  monday.setUTCDate(
    januaryFourth.getUTCDate() - day + 1 + (parsed.week - 1) * 7,
  );

  return monday;
}

function shiftWeekId(weekId: string, deltaWeeks: number) {
  const weekStart = getWeekStartDate(weekId);

  if (!weekStart) {
    return weekId;
  }

  weekStart.setUTCDate(weekStart.getUTCDate() + deltaWeeks * 7);
  return getWeekIdForTimezone(weekStart, 'UTC');
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildStyleDescriptor(styleProfile: StyleProfile) {
  return {
    toxicityLevel: styleProfile.toxicityLevel,
    allowAttack: styleProfile.allowAttack,
    allowHumiliation: styleProfile.allowHumiliation,
    allowLabeling: styleProfile.allowLabeling,
    textualSummary: `毒舌强度 ${styleProfile.toxicityLevel}/10；攻击性吐槽：${styleProfile.allowAttack ? '允许' : '关闭'}；公开羞辱：${styleProfile.allowHumiliation ? '允许' : '关闭'}；贴标签：${styleProfile.allowLabeling ? '允许' : '关闭'}`,
  };
}

function formatDistributionLabel(taskType: TaskType) {
  if (taskType === TaskType.LIGHT) {
    return '随手活';
  }

  if (taskType === TaskType.CORE) {
    return '主力活';
  }

  return '硬仗';
}

function extractContent(response: ChatCompletionResponse) {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? '')
      .join('')
      .trim();
  }

  return '';
}

function isStructuredVerdict(content: string) {
  if (content.length < 120) {
    return false;
  }

  return REQUIRED_SECTIONS.every((section) => content.includes(section));
}

function normalizeProviderName(value: string | undefined) {
  return value?.trim().toLowerCase() ?? 'custom';
}

function normalizeOptionalConfig(value: string | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

@Injectable()
export class VerdictsService {
  private readonly logger = new Logger(VerdictsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly boardService: BoardService,
    private readonly realtimeService: RealtimeService,
  ) {}

  getModuleInfo() {
    return {
      module: 'verdicts',
      status: 'verdict-generation-implemented',
    };
  }

  async generateVerdict(
    familyId: string,
    dto: GenerateVerdictDto,
  ): Promise<VerdictGenerationPayload> {
    await this.boardService.confirmExpiredPendingEvents(familyId);

    const family = await this.prisma.family.findUniqueOrThrow({
      where: {
        id: familyId,
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        currentWeekId: true,
        preference: true,
        taskRules: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: [{ taskType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            taskType: true,
            label: true,
            scoreDelta: true,
            isPinned: true,
          },
        },
      },
    });

    const weekId = dto.weekId ?? family.currentWeekId;
    const styleProfile = {
      toxicityLevel: clamp(
        dto.toxicityLevel ??
          family.preference?.verdictToxicityLevel ??
          5,
        0,
        10,
      ),
      allowAttack: dto.allowAttack ?? family.preference?.allowAttack ?? true,
      allowHumiliation:
        dto.allowHumiliation ?? family.preference?.allowHumiliation ?? true,
      allowLabeling:
        dto.allowLabeling ?? family.preference?.allowLabeling ?? true,
    } satisfies StyleProfile;
    const persona =
      dto.persona ?? family.preference?.verdictPersona ?? '无情裁判长';

    const weeklyStats = await this.buildWeeklyStats(familyId, weekId);
    const promptPayload = this.buildPromptPayload({
      familyName: family.name,
      timezone: family.timezone,
      weekId,
      persona,
      styleProfile,
      weeklyStats,
      taskRules: family.taskRules,
    });

    const aiAttempt = await this.generateWithAi({
      familyName: family.name,
      persona,
      styleProfile,
      promptPayload,
    });

    const generatedAt = new Date();
    const fallbackContent = this.buildFallbackVerdict({
      familyName: family.name,
      persona,
      weekId,
      weeklyStats,
      styleProfile,
      failureReason: aiAttempt.failureReason,
    });

    const finalPayload =
      aiAttempt.content && isStructuredVerdict(aiAttempt.content)
        ? {
            status: VerdictStatus.SUCCESS,
            source: VerdictSource.AI,
            content: aiAttempt.content,
            safetyStatus: 'AI_SUCCESS',
          }
        : {
            status: VerdictStatus.FALLBACK,
            source: VerdictSource.FALLBACK_TEMPLATE,
            content: fallbackContent,
            safetyStatus: aiAttempt.failureReason ?? 'FALLBACK_TEMPLATE',
          };

    if (finalPayload.source === VerdictSource.AI) {
      this.logger.log(
        `Verdict generated with AI for family=${familyId}, week=${weekId}, source=${finalPayload.source}`,
      );
    } else {
      this.logger.warn(
        `Verdict fallback triggered for family=${familyId}, week=${weekId}, reason=${finalPayload.safetyStatus}`,
      );
    }

    const verdict = await this.prisma.verdictRecord.create({
      data: {
        familyId,
        weekId,
        persona,
        styleProfileJson: buildStyleDescriptor(styleProfile),
        source: finalPayload.source,
        status: finalPayload.status,
        content: finalPayload.content,
        inputSnapshotJson: promptPayload as Prisma.InputJsonValue,
        safetyStatus: finalPayload.safetyStatus,
        generatedAt,
      },
      select: {
        id: true,
        weekId: true,
        status: true,
        source: true,
        content: true,
        generatedAt: true,
        safetyStatus: true,
      },
    });

    this.realtimeService.publishVerdictGenerated(familyId, {
      verdictId: verdict.id,
      weekId: verdict.weekId,
      status: verdict.status,
      source: verdict.source,
      generatedAt: verdict.generatedAt,
    });

    return {
      verdictId: verdict.id,
      weekId: verdict.weekId,
      status: verdict.status,
      source: verdict.source,
      content: verdict.content,
      generatedAt: verdict.generatedAt,
      safetyStatus: verdict.safetyStatus,
    };
  }

  async getLatestVerdict(familyId: string, weekId?: string) {
    const family = weekId
      ? null
      : await this.prisma.family.findUniqueOrThrow({
          where: {
            id: familyId,
          },
          select: {
            currentWeekId: true,
          },
        });

    const targetWeekId = weekId ?? family?.currentWeekId;

    const latest = await this.prisma.verdictRecord.findFirst({
      where: {
        familyId,
        ...(targetWeekId ? { weekId: targetWeekId } : {}),
      },
      orderBy: [{ generatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        weekId: true,
        status: true,
        source: true,
        content: true,
        generatedAt: true,
        safetyStatus: true,
      },
    });

    if (!latest) {
      return null;
    }

    return {
      verdictId: latest.id,
      weekId: latest.weekId,
      status: latest.status,
      source: latest.source,
      content: latest.content,
      generatedAt: latest.generatedAt,
      safetyStatus: latest.safetyStatus,
    };
  }

  private async buildWeeklyStats(
    familyId: string,
    weekId: string,
  ): Promise<WeeklyStatsPayload> {
    const [members, events] = await Promise.all([
      this.prisma.member.findMany({
        where: {
          familyId,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          nickname: true,
          sortOrder: true,
          status: true,
        },
      }),
      this.prisma.taskEvent.findMany({
        where: {
          familyId,
          weekId,
          status: EventStatus.CONFIRMED,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          memberId: true,
          memberNicknameSnapshot: true,
          scoreDeltaSnapshot: true,
          taskTypeSnapshot: true,
        },
      }),
    ]);

    const statsMap = new Map<string, MemberWeeklyStats>();
    for (const member of members) {
      statsMap.set(member.id, {
        memberId: member.id,
        nickname: member.nickname,
        totalScore: 0,
        lightCount: 0,
        coreCount: 0,
        epicCount: 0,
      });
    }

    const taskTypeDistribution: Record<TaskType, number> = {
      [TaskType.LIGHT]: 0,
      [TaskType.CORE]: 0,
      [TaskType.EPIC]: 0,
    };

    for (const event of events) {
      taskTypeDistribution[event.taskTypeSnapshot] += 1;

      const memberStats =
        statsMap.get(event.memberId) ??
        {
          memberId: event.memberId,
          nickname: event.memberNicknameSnapshot,
          totalScore: 0,
          lightCount: 0,
          coreCount: 0,
          epicCount: 0,
        };

      memberStats.totalScore += event.scoreDeltaSnapshot;

      if (event.taskTypeSnapshot === TaskType.LIGHT) {
        memberStats.lightCount += 1;
      } else if (event.taskTypeSnapshot === TaskType.CORE) {
        memberStats.coreCount += 1;
      } else {
        memberStats.epicCount += 1;
      }

      statsMap.set(event.memberId, memberStats);
    }

    const memberStats = Array.from(statsMap.values()).sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      return left.nickname.localeCompare(right.nickname, 'zh-CN');
    });

    return {
      weekId,
      championMemberId: memberStats[0]?.memberId ?? null,
      lastMemberId: memberStats.at(-1)?.memberId ?? null,
      totalEvents: events.length,
      totalScore: memberStats.reduce((sum, item) => sum + item.totalScore, 0),
      taskTypeDistribution,
      members: memberStats,
      lastWeekResult: await this.buildLastWeekResult(familyId, weekId, memberStats),
    };
  }

  private async buildLastWeekResult(
    familyId: string,
    currentWeekId: string,
    currentMembers: MemberWeeklyStats[],
  ): Promise<LastWeekResult> {
    const previousWeekId = shiftWeekId(currentWeekId, -1);

    if (previousWeekId === currentWeekId) {
      return null;
    }

    const previousEvents = await this.prisma.taskEvent.findMany({
      where: {
        familyId,
        weekId: previousWeekId,
        status: EventStatus.CONFIRMED,
      },
      select: {
        memberId: true,
        memberNicknameSnapshot: true,
        scoreDeltaSnapshot: true,
        taskTypeSnapshot: true,
      },
    });

    if (!previousEvents.length) {
      return null;
    }

    const previousMap = new Map<string, MemberWeeklyStats>();
    for (const event of previousEvents) {
      const memberStats =
        previousMap.get(event.memberId) ??
        {
          memberId: event.memberId,
          nickname: event.memberNicknameSnapshot,
          totalScore: 0,
          lightCount: 0,
          coreCount: 0,
          epicCount: 0,
        };

      memberStats.totalScore += event.scoreDeltaSnapshot;

      if (event.taskTypeSnapshot === TaskType.LIGHT) {
        memberStats.lightCount += 1;
      } else if (event.taskTypeSnapshot === TaskType.CORE) {
        memberStats.coreCount += 1;
      } else {
        memberStats.epicCount += 1;
      }

      previousMap.set(event.memberId, memberStats);
    }

    const previousMembers = Array.from(previousMap.values()).sort((left, right) =>
      right.totalScore - left.totalScore || left.nickname.localeCompare(right.nickname, 'zh-CN'),
    );
    const previousById = new Map(previousMembers.map((item) => [item.memberId, item]));

    return {
      championMemberId: previousMembers[0]?.memberId ?? null,
      lastMemberId: previousMembers.at(-1)?.memberId ?? null,
      championStreak: previousMembers[0]?.memberId ? 1 : 0,
      lastPlaceStreak: previousMembers.at(-1)?.memberId ? 1 : 0,
      memberDeltaSummary: currentMembers.map((member) => {
        const previous = previousById.get(member.memberId);

        return {
          memberId: member.memberId,
          totalScoreDelta: member.totalScore - (previous?.totalScore ?? 0),
          epicTaskDelta: member.epicCount - (previous?.epicCount ?? 0),
          lightTaskDelta: member.lightCount - (previous?.lightCount ?? 0),
        };
      }),
    };
  }

  private buildPromptPayload(input: {
    familyName: string;
    timezone: string;
    weekId: string;
    persona: string;
    styleProfile: StyleProfile;
    weeklyStats: WeeklyStatsPayload;
    taskRules: Array<{
      taskType: TaskType;
      label: string;
      scoreDelta: number;
      isPinned: boolean;
    }>;
  }) {
    return {
      familyMeta: {
        familyName: input.familyName,
        timezone: input.timezone,
        weekId: input.weekId,
      },
      styleProfile: buildStyleDescriptor(input.styleProfile),
      weeklyStats: input.weeklyStats,
      membersSummary: input.weeklyStats.members.map((member) => ({
        memberId: member.memberId,
        nickname: member.nickname,
        totalScore: member.totalScore,
        lightCount: member.lightCount,
        coreCount: member.coreCount,
        epicCount: member.epicCount,
      })),
      customRules: input.taskRules.map((rule) => ({
        taskType: rule.taskType,
        taskTypeLabel: formatDistributionLabel(rule.taskType),
        label: rule.label,
        scoreDelta: rule.scoreDelta,
        isPinned: rule.isPinned,
      })),
      persona: input.persona,
    };
  }

  private async generateWithAi(input: {
    familyName: string;
    persona: string;
    styleProfile: StyleProfile;
    promptPayload: ReturnType<VerdictsService['buildPromptPayload']>;
  }) {
    const providerConfig = this.resolveProviderConfig();
    const baseUrl = providerConfig.baseUrl?.replace(/\/$/, '') ?? null;
    const apiKey = providerConfig.apiKey;
    const model = providerConfig.model;

    if (!baseUrl || !apiKey || !model) {
      this.logger.warn(
        `LLM provider not configured. provider=${providerConfig.provider}, baseUrl=${Boolean(baseUrl)}, apiKey=${Boolean(apiKey)}, model=${Boolean(model)}`,
      );
      return {
        content: null,
        failureReason: `LLM_NOT_CONFIGURED:${providerConfig.provider}`,
      };
    }

    const timeoutMs = Number(
      this.configService.get<string>('LLM_TIMEOUT_MS') ?? 12000,
    );
    const maxRetries = Number(
      this.configService.get<string>('LLM_MAX_RETRIES') ?? 2,
    );

    const systemPrompt = [
      `你是${input.persona}，要基于真实家庭家务数据输出《家庭判决书》。`,
      '必须使用以下五个一级标题，且顺序不可变：',
      '1. 本周数据总览',
      '2. 冠军表彰',
      '3. 垫底调侃',
      '4. 奖惩建议',
      '5. 暖心结语',
      '要求：',
      '1. 全文 300-500 字，直接输出正文，不要解释过程。',
      `2. 风格参数：${buildStyleDescriptor(input.styleProfile).textualSummary}`,
      '3. 奖惩建议必须具体、能在家庭场景当天或当周落地。',
      '4. 如本周无正式记录，也要按同样结构输出一份可读结果。',
      '5. 允许幽默、有网感，但不要输出违法、暴力、仇恨内容。',
    ].join('\n');

    const userPrompt = [
      `家庭信息：${JSON.stringify(input.promptPayload.familyMeta, null, 2)}`,
      `风格配置：${JSON.stringify(input.promptPayload.styleProfile, null, 2)}`,
      `本周家务数据：${JSON.stringify(input.promptPayload.weeklyStats, null, 2)}`,
      `成员明细：${JSON.stringify(input.promptPayload.membersSummary, null, 2)}`,
      `附加规则：${JSON.stringify(input.promptPayload.customRules, null, 2)}`,
      '请直接输出可朗读的《家庭判决书》正文。',
    ].join('\n\n');

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      this.logger.log(
        `LLM request started. provider=${providerConfig.provider}, model=${model}, attempt=${attempt}/${maxRetries}, timeoutMs=${timeoutMs}`,
      );

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.9,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: userPrompt,
              },
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          this.logger.warn(
            `LLM HTTP error. provider=${providerConfig.provider}, model=${model}, attempt=${attempt}/${maxRetries}, status=${response.status}`,
          );
          throw new Error(`LLM_HTTP_${response.status}`);
        }

        const payload = (await response.json()) as ChatCompletionResponse;
        const content = extractContent(payload);

        if (!content) {
          this.logger.warn(
            `LLM returned empty content. provider=${providerConfig.provider}, model=${model}, attempt=${attempt}/${maxRetries}`,
          );
          throw new Error('LLM_EMPTY_CONTENT');
        }

        this.logger.log(
          `LLM request succeeded. provider=${providerConfig.provider}, model=${model}, attempt=${attempt}/${maxRetries}, contentLength=${content.length}`,
        );

        return {
          content,
          failureReason: null,
        };
      } catch (error) {
        clearTimeout(timer);

        const failureReason =
          error instanceof Error && error.name === 'AbortError'
            ? 'LLM_TIMEOUT'
            : error instanceof Error
              ? error.message
              : 'LLM_REQUEST_FAILED';

        this.logger.warn(
          `LLM request failed. provider=${providerConfig.provider}, model=${model}, attempt=${attempt}/${maxRetries}, reason=${failureReason}`,
        );

        if (attempt === maxRetries) {
          if (
            error instanceof Error &&
            error.name === 'AbortError'
          ) {
            return {
              content: null,
              failureReason: 'LLM_TIMEOUT',
            };
          }

          return {
            content: null,
            failureReason:
              error instanceof Error ? error.message : 'LLM_REQUEST_FAILED',
          };
        }
      }
    }

    return {
      content: null,
      failureReason: 'LLM_REQUEST_FAILED',
    };
  }

  private resolveProviderConfig(): ProviderConfig {
    const provider = normalizeProviderName(
      this.configService.get<string>('LLM_PROVIDER'),
    );
    const explicitBaseUrl = normalizeOptionalConfig(
      this.configService.get<string>('LLM_BASE_URL'),
    );
    const explicitApiKey = normalizeOptionalConfig(
      this.configService.get<string>('LLM_API_KEY'),
    );
    const explicitModel = normalizeOptionalConfig(
      this.configService.get<string>('LLM_MODEL'),
    );

    if (explicitBaseUrl && explicitApiKey && explicitModel) {
      return {
        provider,
        baseUrl: explicitBaseUrl,
        apiKey: explicitApiKey,
        model: explicitModel,
      };
    }

    const presets: Record<string, Omit<ProviderConfig, 'provider'>> = {
      aliyun: {
        baseUrl:
          explicitBaseUrl ??
          'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey:
          explicitApiKey ??
          normalizeOptionalConfig(
            this.configService.get<string>('DASHSCOPE_API_KEY'),
          ) ??
          null,
        model: explicitModel ?? 'qwen-plus',
      },
      deepseek: {
        baseUrl: explicitBaseUrl ?? 'https://api.deepseek.com',
        apiKey:
          explicitApiKey ??
          normalizeOptionalConfig(
            this.configService.get<string>('DEEPSEEK_API_KEY'),
          ) ??
          null,
        model: explicitModel ?? 'deepseek-v4-flash',
      },
      kimi: {
        baseUrl: explicitBaseUrl ?? 'https://api.moonshot.cn/v1',
        apiKey:
          explicitApiKey ??
          normalizeOptionalConfig(
            this.configService.get<string>('MOONSHOT_API_KEY'),
          ) ??
          null,
        model: explicitModel ?? 'kimi-k2.6',
      },
      zhipu: {
        baseUrl:
          explicitBaseUrl ?? 'https://open.bigmodel.cn/api/paas/v4',
        apiKey:
          explicitApiKey ??
          normalizeOptionalConfig(
            this.configService.get<string>('ZAI_API_KEY'),
          ) ??
          null,
        model: explicitModel ?? 'glm-5.1',
      },
      custom: {
        baseUrl: explicitBaseUrl ?? null,
        apiKey: explicitApiKey ?? null,
        model: explicitModel ?? null,
      },
    };

    const preset = presets[provider] ?? presets.custom;

    return {
      provider,
      ...preset,
    };
  }

  private buildFallbackVerdict(input: {
    familyName: string;
    persona: string;
    weekId: string;
    weeklyStats: WeeklyStatsPayload;
    styleProfile: StyleProfile;
    failureReason: string | null;
  }) {
    const champion =
      input.weeklyStats.members[0] ??
      null;
    const trailer = input.weeklyStats.members.at(-1) ?? null;
    const dominantTaskType = (
      Object.entries(input.weeklyStats.taskTypeDistribution) as Array<
        [TaskType, number]
      >
    ).sort((left, right) => right[1] - left[1])[0];
    const dominantTaskLabel =
      dominantTaskType && dominantTaskType[1] > 0
        ? formatDistributionLabel(dominantTaskType[0])
        : '暂无明显集中项';
    const styleTail =
      input.styleProfile.allowHumiliation && trailer
        ? `${trailer.nickname} 本周在榜尾吹风，建议下周别再把存在感交给别人代打。`
        : trailer
          ? `${trailer.nickname} 本周偏安静，下周需要主动补上几笔。`
          : '本周还没有形成明确的末位走势。';
    const rewardLine = champion
      ? `建议把本周奖励发给 ${champion.nickname}：例如本周末少做一次饭后收尾，或者优先拥有一次“今晚不洗碗权”。`
      : '建议本周先不谈奖惩，先把第一批正式记录打出来。';
    const fallbackLead = input.failureReason
      ? '本周网络法官堵车，先由值班书记员宣读简版判决。'
      : '本周由值班书记员代班宣读简版判决。';

    return [
      '本周数据总览',
      `${fallbackLead}${input.familyName} 在 ${input.weekId} 共记下 ${input.weeklyStats.totalEvents} 条正式记录，累计 ${input.weeklyStats.totalScore} 分，当前最集中的家务档位是「${dominantTaskLabel}」。`,
      '',
      '冠军表彰',
      champion
        ? `${champion.nickname} 以 ${champion.totalScore} 分暂居本周榜首，尤其在随手活 ${champion.lightCount} 次、主力活 ${champion.coreCount} 次、硬仗 ${champion.epicCount} 次的组合输出上最有存在感。`
        : '本周还没有任何正式冠军诞生，榜单仍处在等待开张阶段。 ',
      '',
      '垫底调侃',
      styleTail,
      '',
      '奖惩建议',
      rewardLine,
      '',
      '暖心结语',
      `${input.persona} 最后提醒一句：家务这件事不是谁把谁打服，而是把日子一起过顺。哪怕这次先看简版，分工也要继续往前推。`,
    ].join('\n');
  }
}
