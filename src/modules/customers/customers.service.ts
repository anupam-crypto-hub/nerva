import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/database';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert a customer from event data.
   * Normalizes phone to E.164 and prevents duplicates.
   */
  async upsertFromEvent(
    workspaceId: string,
    data: {
      external_customer_id?: string;
      name?: string;
      phone?: string;
      email?: string;
      language?: string;
      timezone?: string;
      tags?: string[];
    },
  ) {
    const normalizedPhone = data.phone ? this.normalizePhone(data.phone) : undefined;

    // Try to find existing customer by external ID or phone
    let existing = null;

    if (data.external_customer_id) {
      existing = await this.prisma.customer.findFirst({
        where: { workspaceId, externalCustomerId: data.external_customer_id },
      });
    }

    if (!existing && normalizedPhone) {
      existing = await this.prisma.customer.findFirst({
        where: { workspaceId, phone: normalizedPhone },
      });
    }

    if (existing) {
      // Update existing customer with new data
      return this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: data.name || existing.name,
          phone: normalizedPhone || existing.phone,
          email: data.email || existing.email,
          language: data.language || existing.language,
          timezone: data.timezone || existing.timezone,
          ...(data.tags?.length ? { tags: data.tags } : {}),
        },
      });
    }

    // Create new customer
    return this.prisma.customer.create({
      data: {
        workspaceId,
        externalCustomerId: data.external_customer_id,
        name: data.name,
        phone: normalizedPhone,
        email: data.email,
        language: data.language || 'en',
        timezone: data.timezone || 'Asia/Kolkata',
        tags: data.tags || [],
      },
    });
  }

  async getById(workspaceId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, workspaceId },
    });
    if (!customer) {
      throw new NotFoundException({ errorCode: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    }
    return customer;
  }

  async getByPhone(workspaceId: string, phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    return this.prisma.customer.findFirst({
      where: { workspaceId, phone: normalizedPhone },
    });
  }

  /**
   * Find customer by phone across all workspaces matching a channel ID.
   * Used by WhatsApp webhook to identify workspace + customer from phone.
   */
  async findByPhoneAcrossWorkspaces(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    return this.prisma.customer.findMany({
      where: { phone: normalizedPhone },
      include: { workspace: true },
    });
  }

  /**
   * Normalize phone number to E.164 format.
   * Defaults to IN (+91) country code.
   */
  private normalizePhone(phone: string): string {
    if (!phone) return phone;

    // Already in E.164
    if (phone.startsWith('+') && phone.length >= 12) {
      return phone;
    }

    const parsed = parsePhoneNumberFromString(phone, 'IN');
    if (parsed && parsed.isValid()) {
      return parsed.format('E.164');
    }

    // Fallback: if 10-digit Indian number, prepend +91
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }

    return phone; // Return as-is if can't normalize
  }
}
