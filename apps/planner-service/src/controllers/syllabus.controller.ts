import type { Response } from "express";
import { prisma } from "@repo/db";
import { z } from "zod";
import ErrorHandler from "../utils/errorHandler.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { TryCatch } from "../utils/tryCatch.js";

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizeTopicText = (value: string): string =>
  value.toLowerCase().trim().replace(/\s+/g, " ");

const normalizeChapterLabel = (value: string): string =>
  value
    .replace(/^(unit|chapter|ch\.?|module)\s*\d+[:-]?\s*/i, "")
    .replace(/\(.*?\)\s*$/g, "")
    .replace(/[:\-–—]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeSyllabusKey = (chapter: string, title: string): string =>
  `${normalizeTopicText(normalizeChapterLabel(chapter) || "General")}::${normalizeTopicText(title)}`;

const TITLE_BLOCKLIST = /\b(assignment|quiz|midterm|exam|deadline|submission)\b/i;
const MAX_TOPIC_LENGTH = 120;
type TopicProgressState = "unlinked" | "planned" | "in_progress" | "completed";
type RevisionRecommendationType = "coverage_gap" | "needs_study" | "ready_to_revise";
type RevisionReasonCode =
  | "no_linked_tasks"
  | "linked_tasks_not_started"
  | "linked_tasks_in_progress"
  | "completed_ready_for_revision";
type RevisionSuggestedAction = "create_task" | "view_syllabus" | "revise_topic";
const uuidStringSchema = z.string().uuid();

const readFloat = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
};

const requireUserMode = (req: AuthenticatedRequest): void => {
  if (req.authContext?.mode === "share") {
    throw new ErrorHandler(403, "Share links cannot modify syllabus");
  }
};

const deriveTopicProgressState = (
  statuses: Array<string | null | undefined>,
): TopicProgressState => {
  if (statuses.length === 0) return "unlinked";
  if (statuses.some((status) => status === "COMPLETED")) return "completed";
  if (statuses.some((status) => status === "IN_PROGRESS")) return "in_progress";
  return "planned";
};

const getRevisionRecommendationType = (progressState: TopicProgressState): RevisionRecommendationType => {
  if (progressState === "unlinked") return "coverage_gap";
  if (progressState === "completed") return "ready_to_revise";
  return "needs_study";
};

const getRevisionStateRank = (progressState: TopicProgressState): number => {
  switch (progressState) {
    case "unlinked":
      return 0;
    case "in_progress":
      return 1;
    case "planned":
      return 2;
    case "completed":
      return 3;
  }
};

const getRevisionReasonCode = (progressState: TopicProgressState): RevisionReasonCode => {
  switch (progressState) {
    case "unlinked":
      return "no_linked_tasks";
    case "planned":
      return "linked_tasks_not_started";
    case "in_progress":
      return "linked_tasks_in_progress";
    case "completed":
      return "completed_ready_for_revision";
  }
};

const getRevisionReason = (reasonCode: RevisionReasonCode): string => {
  switch (reasonCode) {
    case "no_linked_tasks":
      return "No task is linked to this topic yet.";
    case "linked_tasks_not_started":
      return "Tasks exist for this topic, but none have been started yet.";
    case "linked_tasks_in_progress":
      return "You already started working on this topic; finish the active study path.";
    case "completed_ready_for_revision":
      return "You have completed at least one task for this topic; schedule a revision pass.";
  }
};

const getSuggestedRevisionAction = (progressState: TopicProgressState): RevisionSuggestedAction => {
  switch (progressState) {
    case "completed":
      return "revise_topic";
    case "in_progress":
      return "view_syllabus";
    case "planned":
    case "unlinked":
      return "create_task";
  }
};

export const listSyllabusTopics = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const categoryId = readString((req.query as any)?.categoryId);
  const topics = await prisma.syllabusTopic.findMany({
    where: {
      userId,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: [{ chapter: "asc" }, { title: "asc" }],
  });

  res.status(200).json({ message: "Syllabus topics fetched", topics });
};

export const createSyllabusTopic = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const categoryId = readString((req.body ?? {}).categoryId);
  const chapter = readString((req.body ?? {}).chapter) ?? "General";
  const title = readString((req.body ?? {}).title);
  if (!categoryId || !title) throw new ErrorHandler(400, "categoryId and title are required");

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!category) throw new ErrorHandler(404, "Category not found");

  const topic = await prisma.syllabusTopic.create({
    data: {
      userId,
      categoryId,
      chapter,
      title,
      notes: readString((req.body ?? {}).notes),
      weight: readFloat((req.body ?? {}).weight),
      estimatedHours: readFloat((req.body ?? {}).estimatedHours),
    },
  });

  res.status(201).json({ message: "Syllabus topic created", topic });
};

export const importSyllabusTopics = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const categoryId = readString((req.body ?? {}).categoryId);
  const rawItems = Array.isArray((req.body ?? {}).items) ? (req.body ?? {}).items : [];
  if (!categoryId) throw new ErrorHandler(400, "categoryId is required");
  if (rawItems.length === 0) throw new ErrorHandler(400, "items are required");

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!category) throw new ErrorHandler(404, "Category not found");

  const existingTopics = await prisma.syllabusTopic.findMany({
    where: { userId, categoryId },
    select: { chapter: true, title: true },
  });
  const existingKeys = new Set(
    existingTopics.map((topic) => normalizeSyllabusKey(topic.chapter || "General", topic.title)),
  );

  const requestKeys = new Set<string>();
  const skipped: Array<{ sourceId?: string | null; title: string; chapter: string; reason: "duplicate" | "invalid" }> = [];
  const createData: Array<{ userId: string; categoryId: string; chapter: string; title: string; notes: string | null }> = [];
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const rawItem of rawItems) {
    const title = readString((rawItem ?? {}).title);
    const chapter = normalizeChapterLabel(readString((rawItem ?? {}).chapter) ?? "General") || "General";
    const notes = readString((rawItem ?? {}).notes);
    const sourceId = readString((rawItem ?? {}).sourceId);

    if (!title) {
      invalidCount += 1;
      skipped.push({ sourceId, title: "", chapter, reason: "invalid" });
      continue;
    }
    if ((rawItem ?? {}).sourceId !== undefined && !sourceId) {
      invalidCount += 1;
      skipped.push({ sourceId: null, title, chapter, reason: "invalid" });
      continue;
    }
    if (title.length > MAX_TOPIC_LENGTH || TITLE_BLOCKLIST.test(normalizeTopicText(title))) {
      invalidCount += 1;
      skipped.push({ sourceId, title, chapter, reason: "invalid" });
      continue;
    }

    const key = normalizeSyllabusKey(chapter, title);
    if (requestKeys.has(key) || existingKeys.has(key)) {
      duplicateCount += 1;
      skipped.push({ sourceId, title, chapter, reason: "duplicate" });
      continue;
    }

    requestKeys.add(key);
    createData.push({
      userId,
      categoryId,
      chapter,
      title,
      notes,
    });
  }

  if (createData.length > 0) {
    await prisma.syllabusTopic.createMany({
      data: createData,
      skipDuplicates: true,
    });
  }

  const createdTopics = createData.length > 0
    ? await prisma.syllabusTopic.findMany({
        where: {
          userId,
          categoryId,
          OR: createData.map((item) => ({
            chapter: item.chapter,
            title: item.title,
          })),
        },
        orderBy: [{ chapter: "asc" }, { title: "asc" }],
      })
    : [];

  res.status(201).json({
    message: "Syllabus topics imported",
    createdTopics,
    skipped,
    stats: {
      requested: rawItems.length,
      created: createdTopics.length,
      skipped: skipped.length,
      duplicates: duplicateCount,
      invalid: invalidCount,
    },
  });
};

export const updateSyllabusTopic = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const id = readString(req.params?.id);
  if (!id) throw new ErrorHandler(400, "Invalid topic id");

  const data: Record<string, unknown> = {};
  const chapter = readString((req.body ?? {}).chapter);
  const title = readString((req.body ?? {}).title);
  const notes = (req.body ?? {}).notes === null ? null : readString((req.body ?? {}).notes);
  const weight = readFloat((req.body ?? {}).weight);
  const estimatedHours = readFloat((req.body ?? {}).estimatedHours);

  if (chapter !== null) data.chapter = chapter;
  if (title !== null) data.title = title;
  if ((req.body ?? {}).notes !== undefined) data.notes = notes;
  if ((req.body ?? {}).weight !== undefined) data.weight = weight;
  if ((req.body ?? {}).estimatedHours !== undefined) data.estimatedHours = estimatedHours;

  const updated = await prisma.syllabusTopic.updateMany({
    where: { id, userId },
    data,
  });
  if (updated.count === 0) throw new ErrorHandler(404, "Topic not found");

  const topic = await prisma.syllabusTopic.findUnique({ where: { id } });
  res.status(200).json({ message: "Syllabus topic updated", topic });
};

export const deleteSyllabusTopic = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const id = readString(req.params?.id);
  if (!id) throw new ErrorHandler(400, "Invalid topic id");

  const deleted = await prisma.syllabusTopic.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) throw new ErrorHandler(404, "Topic not found");
  res.status(200).json({ message: "Syllabus topic deleted" });
};

export const listSyllabusEdges = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const categoryId = readString((req.query as any)?.categoryId);

  const edges = await prisma.syllabusEdge.findMany({
    where: {
      userId,
      ...(categoryId
        ? {
          fromTopic: { categoryId },
          toTopic: { categoryId },
        }
        : {}),
    },
    include: {
      fromTopic: { select: { id: true, chapter: true, title: true, categoryId: true } },
      toTopic: { select: { id: true, chapter: true, title: true, categoryId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.status(200).json({ message: "Syllabus edges fetched", edges });
};

export const createSyllabusEdge = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const fromTopicId = readString((req.body ?? {}).fromTopicId);
  const toTopicId = readString((req.body ?? {}).toTopicId);
  if (!fromTopicId || !toTopicId) throw new ErrorHandler(400, "fromTopicId and toTopicId are required");
  if (fromTopicId === toTopicId) throw new ErrorHandler(400, "Cannot link a topic to itself");

  const [fromTopic, toTopic] = await Promise.all([
    prisma.syllabusTopic.findFirst({ where: { id: fromTopicId, userId }, select: { id: true } }),
    prisma.syllabusTopic.findFirst({ where: { id: toTopicId, userId }, select: { id: true } }),
  ]);
  if (!fromTopic || !toTopic) throw new ErrorHandler(404, "Topic not found");

  const edge = await prisma.syllabusEdge.create({
    data: {
      userId,
      fromTopicId,
      toTopicId,
    },
    include: {
      fromTopic: { select: { id: true, chapter: true, title: true, categoryId: true } },
      toTopic: { select: { id: true, chapter: true, title: true, categoryId: true } },
    },
  });

  res.status(201).json({ message: "Syllabus edge created", edge });
};

export const deleteSyllabusEdge = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const id = readString(req.params?.id);
  if (!id) throw new ErrorHandler(400, "Invalid edge id");

  const deleted = await prisma.syllabusEdge.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) throw new ErrorHandler(404, "Edge not found");
  res.status(200).json({ message: "Syllabus edge deleted" });
};

export const getTaskSyllabusTopics = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const taskId = readString(req.params?.taskId);
  if (!taskId) throw new ErrorHandler(400, "Invalid task id");

  const links = await prisma.taskSyllabusTopic.findMany({
    where: { userId, taskId },
    include: {
      topic: { select: { id: true, chapter: true, title: true, categoryId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.status(200).json({ message: "Task syllabus topics fetched", links });
};

export const setTaskSyllabusTopics = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const taskId = readString(req.params?.taskId);
  if (!taskId) throw new ErrorHandler(400, "Invalid task id");

  const topicIds = Array.isArray((req.body ?? {}).topicIds)
    ? (req.body ?? {}).topicIds.filter((id: any) => typeof id === "string" && id.trim().length > 0)
    : [];

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true, categoryId: true },
  });
  if (!task) throw new ErrorHandler(404, "Task not found");

  if (topicIds.length > 0) {
    const topics = await prisma.syllabusTopic.findMany({
      where: { userId, id: { in: topicIds } },
      select: { id: true, categoryId: true },
    });
    const allowed = new Set(topics.map((t) => t.id));
    const missing = topicIds.filter((id: string) => !allowed.has(id));
    if (missing.length > 0) throw new ErrorHandler(400, "One or more topicIds are invalid");

    if (task.categoryId) {
      const wrongCategory = topics.filter((t) => t.categoryId !== task.categoryId).map((t) => t.id);
      if (wrongCategory.length > 0) {
        throw new ErrorHandler(400, "All topics must belong to the task's category");
      }
    }
  }

  await prisma.taskSyllabusTopic.deleteMany({ where: { userId, taskId } });
  if (topicIds.length > 0) {
    await prisma.taskSyllabusTopic.createMany({
      data: topicIds.map((topicId: string) => ({ userId, taskId, topicId })),
      skipDuplicates: true,
    });
  }

  const links = await prisma.taskSyllabusTopic.findMany({
    where: { userId, taskId },
    include: { topic: { select: { id: true, chapter: true, title: true, categoryId: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.status(200).json({ message: "Task syllabus topics set", links });
};

export const getSyllabusProgress = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const categoryId = readString((req.query as any)?.categoryId);
  if (!categoryId) throw new ErrorHandler(400, "categoryId is required");
  if (!uuidStringSchema.safeParse(categoryId).success) {
    throw new ErrorHandler(400, "categoryId must be a valid UUID");
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!category) throw new ErrorHandler(404, "Category not found");

  const topics = await prisma.syllabusTopic.findMany({
    where: { userId, categoryId },
    include: {
      taskLinks: {
        select: {
          taskId: true,
          task: {
            select: {
              status: true,
            },
          },
        },
      },
    },
    orderBy: [{ chapter: "asc" }, { title: "asc" }],
  });

  const topicRows = topics.map((topic) => {
    const taskStatuses = topic.taskLinks.map((link) => link.task?.status);
    const linkedTaskCount = topic.taskLinks.length;
    const completedTaskCount = taskStatuses.filter((status) => status === "COMPLETED").length;
    const progressState = deriveTopicProgressState(taskStatuses);

    return {
      topicId: topic.id,
      chapter: topic.chapter || "General",
      title: topic.title,
      linkedTaskCount,
      completedTaskCount,
      progressState,
    };
  });

  const chapterMap = new Map<
    string,
    { chapter: string; totalTopics: number; linkedTopics: number; completedTopics: number; coveragePercent: number }
  >();

  for (const topic of topicRows) {
    const chapter = topic.chapter || "General";
    const existing = chapterMap.get(chapter) ?? {
      chapter,
      totalTopics: 0,
      linkedTopics: 0,
      completedTopics: 0,
      coveragePercent: 0,
    };
    existing.totalTopics += 1;
    if (topic.linkedTaskCount > 0) existing.linkedTopics += 1;
    if (topic.progressState === "completed") existing.completedTopics += 1;
    chapterMap.set(chapter, existing);
  }

  const chapters = Array.from(chapterMap.values())
    .map((chapter) => ({
      ...chapter,
      coveragePercent: chapter.totalTopics > 0
        ? Math.round((chapter.linkedTopics / chapter.totalTopics) * 100)
        : 0,
    }))
    .sort((a, b) => a.chapter.localeCompare(b.chapter));

  const linkedTopics = topicRows.filter((topic) => topic.linkedTaskCount > 0).length;
  const completedTopics = topicRows.filter((topic) => topic.progressState === "completed").length;
  const totalTopics = topicRows.length;

  res.status(200).json({
    message: "Syllabus progress fetched",
    categoryId,
    summary: {
      totalTopics,
      linkedTopics,
      completedTopics,
      coveragePercent: totalTopics > 0 ? Math.round((linkedTopics / totalTopics) * 100) : 0,
    },
    chapters,
    topics: topicRows,
  });
});

export const getSyllabusRevisionRecommendations = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const categoryId = readString((req.query as any)?.categoryId);
  if (!categoryId) throw new ErrorHandler(400, "categoryId is required");
  if (!uuidStringSchema.safeParse(categoryId).success) {
    throw new ErrorHandler(400, "categoryId must be a valid UUID");
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!category) throw new ErrorHandler(404, "Category not found");

  const topics = await prisma.syllabusTopic.findMany({
    where: { userId, categoryId },
    include: {
      taskLinks: {
        select: {
          taskId: true,
          task: {
            select: {
              status: true,
            },
          },
        },
      },
    },
    orderBy: [{ chapter: "asc" }, { title: "asc" }],
  });

  const recommendations = topics.map((topic) => {
    const taskStatuses = topic.taskLinks.map((link) => link.task?.status);
    const linkedTaskCount = topic.taskLinks.length;
    const completedTaskCount = taskStatuses.filter((status) => status === "COMPLETED").length;
    const progressState = deriveTopicProgressState(taskStatuses);
    const recommendationType = getRevisionRecommendationType(progressState);
    const reasonCode = getRevisionReasonCode(progressState);

    return {
      topicId: topic.id,
      chapter: topic.chapter || "General",
      title: topic.title,
      progressState,
      recommendationType,
      reasonCode,
      linkedTaskCount,
      completedTaskCount,
      reason: getRevisionReason(reasonCode),
      suggestedAction: getSuggestedRevisionAction(progressState),
    };
  });

  const sortRecommendations = <
    T extends { progressState: TopicProgressState; linkedTaskCount: number; chapter: string; title: string }
  >(items: T[]) =>
    items.sort((a, b) =>
      getRevisionStateRank(a.progressState) - getRevisionStateRank(b.progressState) ||
      (a.linkedTaskCount >= 2 ? 0 : 1) - (b.linkedTaskCount >= 2 ? 0 : 1) ||
      a.chapter.localeCompare(b.chapter) ||
      a.title.localeCompare(b.title));

  const coverageGap = sortRecommendations(
    recommendations.filter((item) => item.recommendationType === "coverage_gap"),
  );
  const needsStudy = sortRecommendations(
    recommendations.filter((item) => item.recommendationType === "needs_study"),
  );
  const readyToRevise = sortRecommendations(
    recommendations.filter((item) => item.recommendationType === "ready_to_revise"),
  );

  res.status(200).json({
    message: "Syllabus revision recommendations fetched",
    categoryId,
    summary: {
      totalTopics: topics.length,
      coverageGapCount: coverageGap.length,
      needsStudyCount: needsStudy.length,
      readyToReviseCount: readyToRevise.length,
      completedTopics: recommendations.filter((item) => item.progressState === "completed").length,
    },
    buckets: {
      coverageGap,
      needsStudy,
      readyToRevise,
    },
  });
});
