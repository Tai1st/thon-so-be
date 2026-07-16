import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SuperAdminCommunesService } from './superadmin-communes.service';
import { ImportCommuneDto } from './dto/import-commune.dto';
import { CreateTenantFromVillageDto } from './dto/create-tenant-from-village.dto';
import { SuperAdminGuard } from '../common/guards/superadmin.guard';

@Controller('superadmin/communes')
@UseGuards(SuperAdminGuard)
export class SuperAdminCommunesController {
  constructor(private communesService: SuperAdminCommunesService) {}

  @Get()
  async findAll() {
    return this.communesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.communesService.findOne(id);
  }

  // multipart/form-data: field "file" (KMZ/KML) + field "name" (tên xã).
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async import(@Body() dto: ImportCommuneDto, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu file KMZ/KML.');
    return this.communesService.importKmz(dto.name, file.buffer);
  }

  @Post(':id/villages/:index/create-tenant')
  async createTenantFromVillage(
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
    @Body() dto: CreateTenantFromVillageDto,
  ) {
    return this.communesService.createTenantFromVillage(id, index, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.communesService.remove(id);
  }
}
