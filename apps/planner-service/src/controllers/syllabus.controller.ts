import type { Response } from "express";
import { prisma } from "@repo/db";
import ErrorHandler from "../utils/errorHandler.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

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

