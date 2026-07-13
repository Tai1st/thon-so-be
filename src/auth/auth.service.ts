import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Account, AccountDocument } from '../schemas/account.schema';
import { JwtPayload } from './jwt-payload.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';

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
      avatarUrl: account.avatarUrl || '',
      residentId: account.residentId ? String(account.residentId) : null,
    };
  }

  // Chủ tài khoản tự sửa hồ sơ của chính mình (hiện chỉ có avatarUrl) —
  // khác admin/accounts vốn chỉ cho Admin sửa role/position của NGƯỜI KHÁC.
  async updateProfile(tenantId: string, accountId: string, dto: UpdateProfileDto) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản.');
    if (dto.avatarUrl !== undefined) account.avatarUrl = dto.avatarUrl;
    await account.save();
    return this.me(tenantId, accountId);
  }

  // Chủ tài khoản tự đổi mật khẩu — bắt buộc xác nhận đúng mật khẩu hiện
  // tại, khác Admin reset-password (không cần biết mật khẩu cũ).
  async changeOwnPassword(tenantId: string, accountId: string, dto: ChangeOwnPasswordDto) {
    const account = await this.accountModel.findOne({ _id: accountId, tenantId });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản.');
    const valid = await bcrypt.compare(dto.currentPassword, account.passwordHash);
    if (!valid) throw new BadRequestException('Mật khẩu hiện tại không đúng.');
    account.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await account.save();
    return { success: true };
  }
}
