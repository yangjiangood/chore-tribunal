import { IsIn, IsOptional, Matches } from 'class-validator';

export const analyticsRanges = ['1w', '4w', '8w', '12w'] as const;

export type AnalyticsRange = (typeof analyticsRanges)[number];

export class AnalyticsOverviewQueryDto {
  @IsOptional()
  @IsIn(analyticsRanges)
  range?: AnalyticsRange;

  @IsOptional()
  @Matches(/^\d{4}-W\d{2}$/)
  referenceWeekId?: string;
}
