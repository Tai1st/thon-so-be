import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema({ _id: false })
class RoleFieldAccess {
  @Prop({ enum: ['view', 'view-edit', 'locked'] }) cccd: string;
  @Prop({ enum: ['view', 'view-edit', 'locked'] }) dob: string;
  @Prop({ enum: ['view', 'view-edit', 'locked'] }) villageFund: string;
  @Prop({ enum: ['view', 'view-edit', 'locked'] }) gpsAddress: string;
}

@Schema()
export class PermissionMatrix {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, unique: true })
  tenantId: Types.ObjectId;

  @Prop({ type: RoleFieldAccess, default: {} })
  resident: RoleFieldAccess;

  @Prop({ type: RoleFieldAccess, default: {} })
  'association-officer': RoleFieldAccess;

  @Prop({ type: RoleFieldAccess, default: {} })
  'village-head': RoleFieldAccess;

  @Prop({ type: RoleFieldAccess, default: {} })
  'security-team': RoleFieldAccess;

  @Prop({ type: RoleFieldAccess, default: {} })
  admin: RoleFieldAccess;
}

export type PermissionMatrixDocument = PermissionMatrix & Document;
export const PermissionMatrixSchema =
  SchemaFactory.createForClass(PermissionMatrix);
