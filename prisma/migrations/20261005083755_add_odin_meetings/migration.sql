-- CreateTable
CREATE TABLE "Meeting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "organisedByMembershipId" INTEGER,
    "title" TEXT NOT NULL,
    "meetingType" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" DATETIME,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "notes" TEXT,
    "transcript" TEXT,
    "aiSummary" TEXT,
    "aiDecisions" TEXT,
    "aiOpportunities" TEXT,
    "aiRisks" TEXT,
    "aiFollowUp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Meeting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Meeting_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Meeting_organisedByMembershipId_fkey" FOREIGN KEY ("organisedByMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetingAttendee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "meetingId" INTEGER NOT NULL,
    "membershipId" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetingAttendee_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetingAction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "meetingId" INTEGER NOT NULL,
    "assignedMembershipId" INTEGER,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeetingAction_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetingAction_assignedMembershipId_fkey" FOREIGN KEY ("assignedMembershipId") REFERENCES "CompanyMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Meeting_companyId_idx" ON "Meeting"("companyId");

-- CreateIndex
CREATE INDEX "Meeting_customerId_idx" ON "Meeting"("customerId");

-- CreateIndex
CREATE INDEX "Meeting_organisedByMembershipId_idx" ON "Meeting"("organisedByMembershipId");

-- CreateIndex
CREATE INDEX "Meeting_companyId_scheduledAt_idx" ON "Meeting"("companyId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Meeting_companyId_status_idx" ON "Meeting"("companyId", "status");

-- CreateIndex
CREATE INDEX "MeetingAttendee_meetingId_idx" ON "MeetingAttendee"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingAttendee_membershipId_idx" ON "MeetingAttendee"("membershipId");

-- CreateIndex
CREATE INDEX "MeetingAction_meetingId_idx" ON "MeetingAction"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingAction_assignedMembershipId_idx" ON "MeetingAction"("assignedMembershipId");

-- CreateIndex
CREATE INDEX "MeetingAction_status_idx" ON "MeetingAction"("status");

-- CreateIndex
CREATE INDEX "MeetingAction_dueDate_idx" ON "MeetingAction"("dueDate");
