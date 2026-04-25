import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildDefaultPreferences } from './preferences.defaults';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  getModuleInfo() {
    return {
      module: 'preferences',
      status: 'preferences-implemented',
    };
  }

  async getPreferences(familyId: string) {
    const preference = await this.prisma.preference.findUnique({
      where: {
        familyId,
      },
    });

    if (preference) {
      return preference;
    }

    return this.prisma.preference.create({
      data: buildDefaultPreferences(familyId),
    });
  }

  async updatePreferences(familyId: string, dto: UpdatePreferencesDto) {
    await this.getPreferences(familyId);

    return this.prisma.preference.update({
      where: {
        familyId,
      },
      data: dto,
    });
  }
}
