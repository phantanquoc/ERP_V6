import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';

export class InternalInspectionService {
  async getAllInspections(month?: number, year?: number): Promise<any[]> {
    try {
      const where: any = {};
      
      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        where.inspectionDate = {
          gte: startDate,
          lte: endDate,
        };
      }

      const inspections = await prisma.internalInspection.findMany({
        where,
        orderBy: {
          inspectionDate: 'desc',
        },
      });

      return inspections.map((inspection, index) => ({
        stt: index + 1,
        id: inspection.id,
        inspectionCode: inspection.inspectionCode,
        inspectionDate: inspection.inspectionDate,
        inspectionPlanCode: inspection.inspectionPlanCode,
        violationCode: inspection.violationCode,
        violationContent: inspection.violationContent,
        violationLevel: inspection.violationLevel,
        violationCategory: inspection.violationCategory,
        violationDescription: inspection.violationDescription,
        inspectedBy: inspection.inspectedBy,
        inspectedByCode: inspection.inspectedByCode,
        verifiedBy1: inspection.verifiedBy1,
        verifiedBy1Code: inspection.verifiedBy1Code,
        verifiedBy2: inspection.verifiedBy2,
        verifiedBy2Code: inspection.verifiedBy2Code,
        status: inspection.status,
        notes: inspection.notes,
      }));
    } catch (error) {
      throw error;
    }
  }

  async getInspectionById(id: string): Promise<any> {
    try {
      const inspection = await prisma.internalInspection.findUnique({
        where: { id },
      });

      if (!inspection) {
        throw new NotFoundError('Inspection not found');
      }

      return inspection;
    } catch (error) {
      throw error;
    }
  }

  async createInspection(data: any): Promise<any> {
    try {
      // Generate inspection code
      const count = await prisma.internalInspection.count();
      const inspectionCode = `KTN-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

      const inspection = await prisma.internalInspection.create({
        data: {
          inspectionCode,
          inspectionDate: new Date(data.inspectionDate),
          inspectionPlanCode: data.inspectionPlanCode,
          inspectionPlanId: data.inspectionPlanId || '',
          violationCode: data.violationCode,
          violationContent: data.violationContent,
          violationLevel: data.violationLevel,
          violationCategory: data.violationCategory,
          violationDescription: data.violationDescription,
          inspectedBy: data.inspectedBy,
          inspectedByCode: data.inspectedByCode,
          verifiedBy1: data.verifiedBy1 || '',
          verifiedBy1Code: data.verifiedBy1Code || '',
          verifiedBy2: data.verifiedBy2 || '',
          verifiedBy2Code: data.verifiedBy2Code || '',
          status: data.status || 'PENDING',
          notes: data.notes || '',
        },
      });

      return inspection;
    } catch (error) {
      throw error;
    }
  }

  async updateInspection(id: string, data: any): Promise<any> {
    try {
      const inspection = await prisma.internalInspection.findUnique({
        where: { id },
      });

      if (!inspection) {
        throw new NotFoundError('Inspection not found');
      }

      const updated = await prisma.internalInspection.update({
        where: { id },
        data: {
          inspectionDate: data.inspectionDate ? new Date(data.inspectionDate) : undefined,
          inspectionPlanCode: data.inspectionPlanCode,
          violationCode: data.violationCode,
          violationContent: data.violationContent,
          violationLevel: data.violationLevel,
          violationCategory: data.violationCategory,
          violationDescription: data.violationDescription,
          inspectedBy: data.inspectedBy,
          inspectedByCode: data.inspectedByCode,
          verifiedBy1: data.verifiedBy1,
          verifiedBy1Code: data.verifiedBy1Code,
          verifiedBy2: data.verifiedBy2,
          verifiedBy2Code: data.verifiedBy2Code,
          status: data.status,
          notes: data.notes,
        },
      });

      return updated;
    } catch (error) {
      throw error;
    }
  }

  async deleteInspection(id: string): Promise<void> {
    try {
      const inspection = await prisma.internalInspection.findUnique({
        where: { id },
      });

      if (!inspection) {
        throw new NotFoundError('Inspection not found');
      }

      await prisma.internalInspection.delete({
        where: { id },
      });
    } catch (error) {
      throw error;
    }
  }

  async searchInspections(query: string): Promise<any[]> {
    try {
      const inspections = await prisma.internalInspection.findMany({
        where: {
          OR: [
            { inspectionCode: { contains: query, mode: 'insensitive' } },
            { violationCode: { contains: query, mode: 'insensitive' } },
            { violationContent: { contains: query, mode: 'insensitive' } },
            { inspectedBy: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: {
          inspectionDate: 'desc',
        },
      });

      return inspections;
    } catch (error) {
      throw error;
    }
  }
}

export default new InternalInspectionService();

