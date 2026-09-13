import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard, requireUserId, type AuthenticatedRequest } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';

type SyncChange = {
  entityType: string;
  entityId: string;
  operation: string;
  updatedAt: string;
  data: Record<string, unknown>;
};

const SYNCABLE = new Set(['category', 'subcategory', 'expense']);

@Controller()
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  @Post('/sync')
  async push(@Req() request: AuthenticatedRequest, @Body() body: { changes?: SyncChange[] }) {
    const userId = requireUserId(request);
    const changes = body.changes ?? [];
    for (const change of changes) {
      if (!SYNCABLE.has(change.entityType)) {
        continue;
      }
      await this.apply(userId, change);
      await this.prismaService.changeLog.create({
        data: {
          userId,
          entityType: change.entityType,
          entityId: change.entityId,
          operation: change.operation,
          payload: JSON.stringify(change.data ?? {}),
          updatedAt: new Date(change.updatedAt || Date.now()),
        },
      });
    }
    return { accepted: changes.filter((change) => SYNCABLE.has(change.entityType)).length };
  }

  @Get('/sync/changes')
  async pull(@Req() request: AuthenticatedRequest, @Query('since') since?: string) {
    const userId = requireUserId(request);
    const when = since ? new Date(since) : new Date(0);
    const rows = await this.prismaService.changeLog.findMany({
      where: { userId, createdAt: { gt: when } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return {
      changes: rows.map((row) => ({
        entityType: row.entityType,
        entityId: row.entityId,
        operation: row.operation,
        updatedAt: row.updatedAt.toISOString(),
        data: JSON.parse(row.payload) as Record<string, unknown>,
      })),
      cursor: new Date().toISOString(),
    };
  }

  // V2 — signed upload/download URLs for receipt files (not used in V1).
  /*
  @Post('/attachments/upload-url')
  uploadUrl(@Body() body: { fileName?: string; expenseId?: string }) {
    const objectPath = `expenses/${body.expenseId ?? 'unknown'}/${body.fileName ?? 'file'}`;
    return {
      objectPath,
      url: `${process.env.API_PUBLIC_URL ?? 'http://localhost:3000'}/attachments/dummy-upload`,
      mode: process.env.CLOUD_MODE ?? 'dummy',
    };
  }

  @Post('/attachments/confirm')
  confirm(@Body() body: { id?: string; objectPath?: string }) {
    return { ok: true, id: body.id, objectPath: body.objectPath };
  }

  @Get('/attachments/:id/download-url')
  downloadUrl() {
    return {
      url: `${process.env.API_PUBLIC_URL ?? 'http://localhost:3000'}/health`,
      mode: process.env.CLOUD_MODE ?? 'dummy',
    };
  }
  */

  private async apply(userId: string, change: SyncChange) {
    const data = change.data ?? {};
    const id = String(data.id ?? change.entityId);
    const updatedAt = new Date(String(data.updatedAt ?? change.updatedAt ?? Date.now()));
    const createdAt = new Date(String(data.createdAt ?? Date.now()));

    if (change.entityType === 'category') {
      if (change.operation === 'DELETE') {
        await this.prismaService.category.updateMany({
          where: { userId, id },
          data: { deletedAt: updatedAt, updatedAt },
        });
        return;
      }
      await this.prismaService.category.upsert({
        where: { userId_id: { userId, id } },
        update: {
          name: String(data.name ?? ''),
          isActive: Boolean(data.isActive ?? true),
          sortOrder: Number(data.sortOrder ?? 0),
          updatedAt,
          deletedAt: null,
        },
        create: {
          id,
          userId,
          name: String(data.name ?? ''),
          isActive: Boolean(data.isActive ?? true),
          sortOrder: Number(data.sortOrder ?? 0),
          createdAt,
          updatedAt,
        },
      });
    }

    if (change.entityType === 'subcategory') {
      if (change.operation === 'DELETE') {
        await this.prismaService.subCategory.updateMany({
          where: { userId, id },
          data: { deletedAt: updatedAt, updatedAt },
        });
        return;
      }
      await this.prismaService.subCategory.upsert({
        where: { userId_id: { userId, id } },
        update: {
          categoryId: String(data.categoryId ?? ''),
          name: String(data.name ?? ''),
          isActive: Boolean(data.isActive ?? true),
          sortOrder: Number(data.sortOrder ?? 0),
          updatedAt,
          deletedAt: null,
        },
        create: {
          id,
          userId,
          categoryId: String(data.categoryId ?? ''),
          name: String(data.name ?? ''),
          isActive: Boolean(data.isActive ?? true),
          sortOrder: Number(data.sortOrder ?? 0),
          createdAt,
          updatedAt,
        },
      });
    }

    if (change.entityType === 'expense') {
      const existing = await this.prismaService.expense.findUnique({ where: { id } });
      if (existing && existing.userId !== userId) {
        throw new ForbiddenException('That record belongs to another account.');
      }
      if (change.operation === 'DELETE') {
        await this.prismaService.expense.updateMany({
          where: { id, userId },
          data: { deletedAt: updatedAt, updatedAt },
        });
        return;
      }
      await this.prismaService.expense.upsert({
        where: { id },
        update: {
          expenseId: String(data.expenseId ?? ''),
          expenseDate: String(data.expenseDate ?? ''),
          categoryId: String(data.categoryId ?? ''),
          subCategoryId: data.subCategoryId ? String(data.subCategoryId) : null,
          amount: Number(data.amount ?? 0),
          description: data.description ? String(data.description) : null,
          vendorId: null,
          gstRate: data.gstRate === null || data.gstRate === undefined ? null : Number(data.gstRate),
          gstAmount: data.gstAmount === null || data.gstAmount === undefined ? null : Number(data.gstAmount),
          paymentMethod: String(data.paymentMethod ?? 'Other'),
          billNumber: data.billNumber ? String(data.billNumber) : null,
          notes: data.notes ? String(data.notes) : null,
          updatedAt,
          deletedAt: null,
        },
        create: {
          id,
          userId,
          expenseId: String(data.expenseId ?? id),
          expenseDate: String(data.expenseDate ?? ''),
          categoryId: String(data.categoryId ?? ''),
          subCategoryId: data.subCategoryId ? String(data.subCategoryId) : null,
          amount: Number(data.amount ?? 0),
          description: data.description ? String(data.description) : null,
          vendorId: null,
          gstRate: data.gstRate === null || data.gstRate === undefined ? null : Number(data.gstRate),
          gstAmount: data.gstAmount === null || data.gstAmount === undefined ? null : Number(data.gstAmount),
          paymentMethod: String(data.paymentMethod ?? 'Other'),
          billNumber: data.billNumber ? String(data.billNumber) : null,
          notes: data.notes ? String(data.notes) : null,
          createdAt,
          updatedAt,
        },
      });
    }

    // Vendor and business_profile sync are deferred to a later version.
  }
}
