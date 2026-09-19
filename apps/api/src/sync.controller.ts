import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Logger,
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

const SYNCABLE = new Set([
  'category',
  'subcategory',
  'expense',
  'budget',
  'debt_person',
  'debt_transaction',
]);

@Controller()
@UseGuards(JwtAuthGuard)
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  @Post('/sync')
  async push(@Req() request: AuthenticatedRequest, @Body() body: { changes?: SyncChange[] }) {
    const userId = requireUserId(request);
    const changes = body.changes ?? [];
    const failed: Array<{ entityId: string; entityType: string }> = [];
    let accepted = 0;

    for (const change of changes) {
      if (!SYNCABLE.has(change.entityType)) {
        continue;
      }
      try {
        await this.apply(userId, change);
        await this.prismaService.changeLog.create({
          data: {
            userId,
            entityType: change.entityType,
            entityId: change.entityId,
            operation: change.operation,
            payload: JSON.stringify(change.data ?? {}),
            updatedAt: this.toDate(change.updatedAt),
          },
        });
        accepted += 1;
      } catch (error) {
        this.logger.warn(
          `Sync apply failed for ${change.entityType} ${change.entityId}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
        failed.push({ entityId: change.entityId, entityType: change.entityType });
      }
    }

    return { accepted, failed };
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

  private toDate(value: unknown, fallback?: Date): Date {
    const fallbackDate =
      fallback && !Number.isNaN(fallback.getTime()) ? fallback : new Date();
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? fallbackDate : parsed;
    }
    if (typeof value === 'string' && value.trim()) {
      const trimmed = value.trim();
      if (/^\d{10}$/.test(trimmed) || /^\d{13}$/.test(trimmed)) {
        const ms = trimmed.length === 10 ? Number(trimmed) * 1000 : Number(trimmed);
        const parsed = new Date(ms);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return fallbackDate;
  }

  private async apply(userId: string, change: SyncChange) {
    const data = change.data ?? {};
    const id = String(data.id ?? change.entityId);
    const updatedAt = this.toDate(data.updatedAt, this.toDate(change.updatedAt));
    const createdAt = this.toDate(data.createdAt, updatedAt);

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

    if (change.entityType === 'budget') {
      const categoryId = String(data.categoryId ?? '');
      const periodStart = String(data.periodStart ?? '');
      const periodEnd = String(data.periodEnd ?? '');
      const amount = Number(data.amount ?? 0);
      if (!(amount > 0)) {
        throw new ForbiddenException('Budget amount must be greater than 0.');
      }
      const category = await this.prismaService.category.findUnique({
        where: { userId_id: { userId, id: categoryId } },
      });
      if (!category || category.deletedAt) {
        throw new ForbiddenException('Category not found.');
      }
      if (change.operation === 'DELETE') {
        await this.prismaService.budget.updateMany({
          where: { userId, id },
          data: { deletedAt: updatedAt, updatedAt },
        });
        return;
      }
      const duplicate = await this.prismaService.budget.findFirst({
        where: {
          userId,
          categoryId,
          periodStart,
          periodEnd,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ForbiddenException('A budget already exists for this category and period.');
      }
      await this.prismaService.budget.upsert({
        where: { userId_id: { userId, id } },
        update: {
          categoryId,
          periodType: String(data.periodType ?? 'MONTHLY'),
          periodStart,
          periodEnd,
          amount,
          updatedAt,
          deletedAt: null,
        },
        create: {
          id,
          userId,
          categoryId,
          periodType: String(data.periodType ?? 'MONTHLY'),
          periodStart,
          periodEnd,
          amount,
          createdAt,
          updatedAt,
        },
      });
      return;
    }

    if (change.entityType === 'debt_person') {
      const mobileNumber = String(data.mobileNumber ?? '').replace(/\D/g, '');
      const name = String(data.name ?? '').trim();
      const direction = String(data.direction ?? 'TAKEN');
      if (!name) {
        throw new ForbiddenException('Name is required.');
      }
      if (!/^\d{10,15}$/.test(mobileNumber)) {
        throw new ForbiddenException('Invalid mobile number.');
      }
      if (change.operation === 'DELETE') {
        await this.prismaService.debtPerson.updateMany({
          where: { userId, id },
          data: { deletedAt: updatedAt, updatedAt },
        });
        return;
      }
      const duplicate = await this.prismaService.debtPerson.findFirst({
        where: { userId, mobileNumber, deletedAt: null, NOT: { id } },
      });
      if (duplicate) {
        throw new ForbiddenException('Mobile number already in use.');
      }
      await this.prismaService.debtPerson.upsert({
        where: { userId_id: { userId, id } },
        update: { name, mobileNumber, direction, updatedAt, deletedAt: null },
        create: {
          id,
          userId,
          name,
          mobileNumber,
          direction,
          createdAt,
          updatedAt,
        },
      });
      return;
    }

    if (change.entityType === 'debt_transaction') {
      const personId = String(data.personId ?? '');
      const type = String(data.type ?? '');
      const amount = Number(data.amount ?? 0);
      const transactionDate = String(data.transactionDate ?? '');
      if (!(amount > 0)) {
        throw new ForbiddenException('Amount must be greater than 0.');
      }
      const person = await this.prismaService.debtPerson.findUnique({
        where: { userId_id: { userId, id: personId } },
      });
      if (!person || person.deletedAt) {
        throw new ForbiddenException('Person not found.');
      }
      const allowed =
        person.direction === 'TAKEN'
          ? new Set(['BORROWED', 'REPAID'])
          : new Set(['GIVEN', 'RECEIVED']);
      if (!allowed.has(type)) {
        throw new ForbiddenException('Invalid transaction type.');
      }
      if (change.operation === 'DELETE') {
        await this.prismaService.debtTransaction.updateMany({
          where: { userId, id },
          data: { deletedAt: updatedAt, updatedAt },
        });
        return;
      }
      await this.prismaService.debtTransaction.upsert({
        where: { userId_id: { userId, id } },
        update: {
          personId,
          type,
          amount,
          transactionDate,
          note: data.note ? String(data.note) : null,
          updatedAt,
          deletedAt: null,
        },
        create: {
          id,
          userId,
          personId,
          type,
          amount,
          transactionDate,
          note: data.note ? String(data.note) : null,
          createdAt,
          updatedAt,
        },
      });
      return;
    }

    // Vendor and business_profile sync are deferred to a later version.
  }
}
