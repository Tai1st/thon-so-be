import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { SuperAdmin, SuperAdminDocument } from '../schemas/tenant.schema';
import type { SuperAdminPayload } from '../common/guards/superadmin.guard';

@Injectable()
export class SuperAdminAuthService {
  constructor(
    @InjectModel(SuperAdmin.name) private superAdminModel: Model<SuperAdminDocument>,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const account = await this.superAdminModel.findOne({ username: username.trim() });
    if (!account) throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu.');
    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu.');

    const payload: SuperAdminPayload = {
      superAdminId: String(account._id),
      scope: 'superadmin',
    };
    return {
      accessToken: this.jwtService.sign(payload),
      superAdmin: { id: String(account._id), username: account.username },
    };
  }
}
