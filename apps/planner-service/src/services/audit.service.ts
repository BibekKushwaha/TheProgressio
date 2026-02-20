import { prisma } from "@repo/db";

export const logAuditAction = async (
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details?: string
) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entityType,
                entityId,
                details: details ?? null,
            }
        });
    } catch (error) {
        console.error("Failed to log audit action:", error);
    }
};
