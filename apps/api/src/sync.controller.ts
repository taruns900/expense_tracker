import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';

type SyncChange = {
  entityType: string;
  entityId: string;
  operation: string;
  updatedAt: string;
  data: Record<string, unknown>;
};

@Controller()
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('/sync')
  async push(@Body() body: { changes?: SyncChange[] }) {
    const changes = body.changes ?? [];
    for (const change of changes) {
      await this.apply(change);
      await this.prisma.changeLog.create({
        data: {
          entityType: change.entityType,
          entityId: change.entityId,
          operation: change.operation,
          payload: JSON.stringify(change.data ?? {}),
          updatedAt: new Date(change.updatedAt || Date.now()),
        },
      });
    }
    return { accepted: changes.length };
  }

  @Get('/sync/changes')
  async pull(@Query('since') since?: string) {
    const when = since ? new Date(since) : new Date(0);
    const rows = await this.prisma.changeLog.findMany({
      where: { createdAt: { gt: when } },
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

  private async apply(change: SyncChange) {
    const data = change.data ?? {};
    const id = String(data.id ?? change.entityId);
    const updatedAt = new Date(String(data.updatedAt ?? change.updatedAt ?? Date.now()));
    const createdAt = new Date(String(data.createdAt ?? Date.now()));

    if (change.entityType === 'category') {
      if (change.operation === 'DELETE') {
        await this.prisma.category.updateMany({ where: { id }, data: { deletedAt: updatedAt, updatedAt } });
        return;
      }
      await this.prisma.category.upsert({
        where: { id },
        update: {
          name: String(data.name ?? ''),
          isActive: Boolean(data.isActive ?? true),
          sortOrder: Number(data.sortOrder ?? 0),
          updatedAt,
        },
        create: {
          id,
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
        await this.prisma.subCategory.updateMany({ where: { id }, data: { deletedAt: updatedAt, updatedAt } });
        return;
      }
      await this.prisma.subCategory.upsert({
        where: { id },
        update: {
          categoryId: String(data.categoryId ?? ''),
          name: String(data.name ?? ''),
          isActive: Boolean(data.isActive ?? true),
          sortOrder: Number(data.sortOrder ?? 0),
          updatedAt,
        },
        create: {
          id,
          categoryId: String(data.categoryId ?? ''),
          name: String(data.name ?? ''),
          isActive: Boolean(data.isActive ?? true),
          sortOrder: Number(data.sortOrder ?? 0),
          createdAt,
          updatedAt,
        },
      });
    }

    if (change.entityType === 'vendor') {
      if (change.operation === 'DELETE') {
        await this.prisma.vendor.updateMany({ where: { id }, data: { deletedAt: updatedAt, updatedAt } });
        return;
      }
      await this.prisma.vendor.upsert({
        where: { id },
        update: {
          name: String(data.name ?? ''),
          email: data.email ? String(data.email) : null,
          phone: data.phone ? String(data.phone) : null,
          address: data.address ? String(data.address) : null,
          gstNumber: data.gstNumber ? String(data.gstNumber) : null,
          isActive: Boolean(data.isActive ?? true),
          updatedAt,
        },
        create: {
          id,
          name: String(data.name ?? ''),
          email: data.email ? String(data.email) : null,
          phone: data.phone ? String(data.phone) : null,
          address: data.address ? String(data.address) : null,
          gstNumber: data.gstNumber ? String(data.gstNumber) : null,
          isActive: Boolean(data.isActive ?? true),
          createdAt,
          updatedAt,
        },
      });
    }

    if (change.entityType === 'expense') {
      if (change.operation === 'DELETE') {
        await this.prisma.expense.updateMany({ where: { id }, data: { deletedAt: updatedAt, updatedAt } });
        return;
      }
      await this.prisma.expense.upsert({
        where: { id },
        update: {
          expenseId: String(data.expenseId ?? ''),
          expenseDate: String(data.expenseDate ?? ''),
          categoryId: String(data.categoryId ?? ''),
          subCategoryId: data.subCategoryId ? String(data.subCategoryId) : null,
          amount: Number(data.amount ?? 0),
          description: data.description ? String(data.description) : null,
          vendorId: data.vendorId ? String(data.vendorId) : null,
          gstRate: data.gstRate === null || data.gstRate === undefined ? null : Number(data.gstRate),
          gstAmount: data.gstAmount === null || data.gstAmount === undefined ? null : Number(data.gstAmount),
          paymentMethod: String(data.paymentMethod ?? 'Other'),
          billNumber: data.billNumber ? String(data.billNumber) : null,
          notes: data.notes ? String(data.notes) : null,
          updatedAt,
        },
        create: {
          id,
          expenseId: String(data.expenseId ?? id),
          expenseDate: String(data.expenseDate ?? ''),
          categoryId: String(data.categoryId ?? ''),
          subCategoryId: data.subCategoryId ? String(data.subCategoryId) : null,
          amount: Number(data.amount ?? 0),
          description: data.description ? String(data.description) : null,
          vendorId: data.vendorId ? String(data.vendorId) : null,
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

    if (change.entityType === 'business_profile') {
      await this.prisma.businessProfile.upsert({
        where: { id },
        update: {
          businessName: data.businessName ? String(data.businessName) : null,
          address: data.address ? String(data.address) : null,
          phone: data.phone ? String(data.phone) : null,
          email: data.email ? String(data.email) : null,
          gstNumber: data.gstNumber ? String(data.gstNumber) : null,
          updatedAt,
        },
        create: {
          id,
          businessName: data.businessName ? String(data.businessName) : null,
          address: data.address ? String(data.address) : null,
          phone: data.phone ? String(data.phone) : null,
          email: data.email ? String(data.email) : null,
          gstNumber: data.gstNumber ? String(data.gstNumber) : null,
          createdAt,
          updatedAt,
        },
      });
    }
  }
}
