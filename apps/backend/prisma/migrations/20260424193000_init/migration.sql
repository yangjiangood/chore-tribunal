-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FamilyMode" AS ENUM ('LOCAL', 'CLOUD');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'DISABLED', 'LEFT');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('LIGHT', 'CORE', 'EPIC');

-- CreateEnum
CREATE TYPE "TaskRuleStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REVERTED');

-- CreateEnum
CREATE TYPE "VerdictSource" AS ENUM ('AI', 'FALLBACK_TEMPLATE');

-- CreateEnum
CREATE TYPE "VerdictStatus" AS ENUM ('SUCCESS', 'FAILED', 'FALLBACK');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE_MEMBER', 'UPDATE_MEMBER', 'DISABLE_MEMBER', 'DELETE_MEMBER', 'CREATE_TASK_RULE', 'UPDATE_TASK_RULE', 'DISABLE_TASK_RULE', 'RESET_RULES', 'UPDATE_PREFERENCES', 'CLEAR_CURRENT_WEEK', 'DELETE_ARCHIVE', 'CHANGE_PASSWORD');

-- CreateTable
CREATE TABLE "family_accounts" (
    "id" UUID NOT NULL,
    "account_name" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "password_algo" VARCHAR(30) NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "family_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "mode" "FamilyMode" NOT NULL,
    "timezone" VARCHAR(50) NOT NULL,
    "current_week_id" VARCHAR(20) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_sessions" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "device_label" VARCHAR(100),
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "nickname" VARCHAR(30) NOT NULL,
    "avatar_type" VARCHAR(20) NOT NULL,
    "avatar_url" TEXT,
    "avatar_value" VARCHAR(20),
    "card_color" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_week_id" VARCHAR(20) NOT NULL,
    "left_week_id" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_rules" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "task_type" "TaskType" NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "score_delta" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "status" "TaskRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "task_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_events" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "task_rule_id" UUID,
    "week_id" VARCHAR(20) NOT NULL,
    "task_type_snapshot" "TaskType" NOT NULL,
    "task_label_snapshot" VARCHAR(50) NOT NULL,
    "score_delta_snapshot" INTEGER NOT NULL,
    "member_nickname_snapshot" VARCHAR(30) NOT NULL,
    "client_event_id" VARCHAR(100) NOT NULL,
    "undo_token" VARCHAR(100) NOT NULL,
    "undo_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "EventStatus" NOT NULL,
    "reverted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(6),

    CONSTRAINT "task_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_archives" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "week_id" VARCHAR(20) NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "total_events" INTEGER NOT NULL,
    "total_score" INTEGER NOT NULL,
    "summary_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verdict_records" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "week_id" VARCHAR(20) NOT NULL,
    "archive_id" UUID,
    "persona" VARCHAR(50) NOT NULL,
    "style_profile_json" JSONB NOT NULL,
    "source" "VerdictSource" NOT NULL,
    "status" "VerdictStatus" NOT NULL,
    "content" TEXT NOT NULL,
    "input_snapshot_json" JSONB NOT NULL,
    "safety_status" VARCHAR(30),
    "generated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verdict_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferences" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "default_fullscreen" BOOLEAN NOT NULL DEFAULT false,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT false,
    "motion_enabled" BOOLEAN NOT NULL DEFAULT true,
    "font_scale" VARCHAR(20) NOT NULL,
    "theme_style" VARCHAR(30) NOT NULL,
    "log_speed" VARCHAR(20) NOT NULL,
    "card_density" VARCHAR(20) NOT NULL,
    "idle_reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "verdict_persona" VARCHAR(50) NOT NULL,
    "verdict_toxicity_level" INTEGER NOT NULL DEFAULT 5,
    "allow_attack" BOOLEAN NOT NULL DEFAULT true,
    "allow_humiliation" BOOLEAN NOT NULL DEFAULT true,
    "allow_labeling" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "operator_account_id" UUID NOT NULL,
    "target_type" VARCHAR(30),
    "target_id" UUID,
    "before_json" JSONB,
    "after_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_accounts_account_name_key" ON "family_accounts"("account_name");

-- CreateIndex
CREATE INDEX "family_accounts_created_at_idx" ON "family_accounts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "families_account_id_key" ON "families"("account_id");

-- CreateIndex
CREATE INDEX "families_current_week_id_idx" ON "families"("current_week_id");

-- CreateIndex
CREATE INDEX "family_sessions_family_id_idx" ON "family_sessions"("family_id");

-- CreateIndex
CREATE INDEX "family_sessions_expires_at_idx" ON "family_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "members_family_id_status_idx" ON "members"("family_id", "status");

-- CreateIndex
CREATE INDEX "members_family_id_sort_order_idx" ON "members"("family_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "members_family_id_nickname_key" ON "members"("family_id", "nickname");

-- CreateIndex
CREATE INDEX "task_rules_family_id_status_idx" ON "task_rules"("family_id", "status");

-- CreateIndex
CREATE INDEX "task_rules_family_id_task_type_sort_order_idx" ON "task_rules"("family_id", "task_type", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "task_rules_family_id_task_type_label_key" ON "task_rules"("family_id", "task_type", "label");

-- CreateIndex
CREATE INDEX "task_events_family_id_week_id_idx" ON "task_events"("family_id", "week_id");

-- CreateIndex
CREATE INDEX "task_events_family_id_status_created_at_idx" ON "task_events"("family_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "task_events_family_id_member_id_week_id_idx" ON "task_events"("family_id", "member_id", "week_id");

-- CreateIndex
CREATE INDEX "task_events_week_id_created_at_idx" ON "task_events"("week_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "task_events_family_id_client_event_id_key" ON "task_events"("family_id", "client_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_events_undo_token_key" ON "task_events"("undo_token");

-- CreateIndex
CREATE INDEX "weekly_archives_family_id_week_id_idx" ON "weekly_archives"("family_id", "week_id");

-- CreateIndex
CREATE INDEX "weekly_archives_created_at_idx" ON "weekly_archives"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_archives_family_id_week_id_key" ON "weekly_archives"("family_id", "week_id");

-- CreateIndex
CREATE INDEX "verdict_records_family_id_week_id_generated_at_idx" ON "verdict_records"("family_id", "week_id", "generated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "preferences_family_id_key" ON "preferences"("family_id");

-- CreateIndex
CREATE INDEX "audit_logs_family_id_created_at_idx" ON "audit_logs"("family_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_family_id_action_idx" ON "audit_logs"("family_id", "action");

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "family_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_sessions" ADD CONSTRAINT "family_sessions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_rules" ADD CONSTRAINT "task_rules_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_task_rule_id_fkey" FOREIGN KEY ("task_rule_id") REFERENCES "task_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_archives" ADD CONSTRAINT "weekly_archives_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verdict_records" ADD CONSTRAINT "verdict_records_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verdict_records" ADD CONSTRAINT "verdict_records_archive_id_fkey" FOREIGN KEY ("archive_id") REFERENCES "weekly_archives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_operator_account_id_fkey" FOREIGN KEY ("operator_account_id") REFERENCES "family_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
