import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto';

@Injectable()
export class PublicHolidaysService {
  constructor(private prisma: PrismaService) {}

  async findAll(year?: number) {
    return this.prisma.publicHoliday.findMany({
      where: year ? { year } : {},
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    const h = await this.prisma.publicHoliday.findUnique({ where: { id } });
    if (!h) throw new NotFoundException('Holiday not found');
    return h;
  }

  async create(dto: CreateHolidayDto) {
    return this.prisma.publicHoliday.create({
      data: { ...dto, date: new Date(dto.date) },
    });
  }

  async bulkCreate(holidays: CreateHolidayDto[]) {
    const data = holidays.map(h => ({ ...h, date: new Date(h.date) }));
    return this.prisma.publicHoliday.createMany({ data, skipDuplicates: true });
  }

  async update(id: string, dto: UpdateHolidayDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.date) data.date = new Date(dto.date);
    return this.prisma.publicHoliday.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.publicHoliday.delete({ where: { id } });
  }

  // Copy recurring holidays to new year
  async copyToYear(fromYear: number, toYear: number) {
    const recurring = await this.prisma.publicHoliday.findMany({
      where: { year: fromYear, isRecurring: true },
    });
    const newHolidays = recurring.map(h => {
      const d = new Date(h.date);
      d.setFullYear(toYear);
      return { nameKh: h.nameKh, nameEn: h.nameEn, date: d, year: toYear, isRecurring: true };
    });
    return this.prisma.publicHoliday.createMany({ data: newHolidays, skipDuplicates: true });
  }
}
