import { Controller, Get } from '@nestjs/common';
import { CommunesService } from './communes.service';

@Controller('communes')
export class CommunesController {
  constructor(private communesService: CommunesService) {}

  @Get('public')
  async findAllPublic() {
    return this.communesService.findAllPublic();
  }
}
