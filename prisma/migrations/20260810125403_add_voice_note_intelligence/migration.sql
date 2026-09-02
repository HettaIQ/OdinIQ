-- AlterTable
ALTER TABLE "CustomerVoiceNote" ADD COLUMN "opportunitySummary" TEXT;
ALTER TABLE "CustomerVoiceNote" ADD COLUMN "sentiment" TEXT;
ALTER TABLE "CustomerVoiceNote" ADD COLUMN "suggestedTaskDescription" TEXT;
ALTER TABLE "CustomerVoiceNote" ADD COLUMN "suggestedTaskDueDate" DATETIME;
ALTER TABLE "CustomerVoiceNote" ADD COLUMN "suggestedTaskPriority" TEXT;
ALTER TABLE "CustomerVoiceNote" ADD COLUMN "suggestedTaskTitle" TEXT;
