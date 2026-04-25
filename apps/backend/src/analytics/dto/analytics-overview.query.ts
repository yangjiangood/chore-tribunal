import { IsIn, IsOptional } from 'class-validator';

export const analyticsRanges = ['1w', '4w', '8w', '12w'] as const;

export type AnalyticsRange = (typeof analyticsRanges)[number];

export class AnalyticsOverviewQueryDto {
  @IsOptional()
  @IsIn(analyticsRanges)
  range?: AnalyticsRange;
}
