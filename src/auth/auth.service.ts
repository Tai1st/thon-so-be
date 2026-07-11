import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Account, AccountDocument } from '../schemas/account.schema';
import { JwtPayload } from './jwt-payload.interface';

export interface LoginResult {
  accessToken: string;
  account: { id: string; name: string; role: string };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    private jwtService: JwtService,
  ) {}

  // Username chỉ cần unique TRONG tenant (mục 6.1 tài liệu thiết kế) — luôn
  // scope theo tenantId, không bao giờ tìm account trần theo username.
  async login(
    tenantId: Types.ObjectId,
    username: string,
    password: string,
  ): Promise<LoginResult> {
    const account = await this.accountModel.findOne({
      tenantId,
      username: username.trim(),
    });
    if (!account) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu.');
    }
    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu.');
    }
    if (account.status !== 'active') {
      throw new UnauthorizedException('Tài khoản đã bị khóa.');
    }

    account.lastActive = 'Vừa xong';
    await account.save();

    const payload: JwtPayload = {
      accountId: String(account._id),
      tenantId: String(tenantId),
      role: account.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      account: { id: String(account._id), name: account.name, role: account.role },
    };
  }

  async me(tenantId: string, accountId: string) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản.');
    return {
      id: String(account._id),
      name: account.name,
      role: account.role,
      position: account.position,
      assoc: account.assoc,
      residentId: account.residentId ? String(account.residentId) : null,
    };
  }
}
