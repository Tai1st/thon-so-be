import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

const REQUEST_STATUS = ['pending', 'approved', 'rejected'];

@Schema()
export class DeleteRequest {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  residentId: string;

  @Prop({ required: true })
  residentName: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  submittedBy: string;

  @Prop({ enum: REQUEST_STATUS, default: 'pending' })
  status: string;

  @Prop({ required: true })
  time: string;
}
export type DeleteRequestDocument = DeleteRequest & Document;
export const DeleteRequestSchema = SchemaFactory.createForClass(DeleteRequest);

@Schema({ _id: false })
class EditableMemberFields {
  @Prop() name: string;
  @Prop() relation: string;
  @Prop() dob: string;
  @Prop() cccd: string;
  @Prop() gender: string;
  @Prop() phone: string;
  @Prop() fatherName: string;
  @Prop() motherName: string;
  @Prop() group: string;
  @Prop() permanentAddress: string;
  @Prop() temporaryAddress: string;
}

@Schema()
export class MemberEditRequest {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  residentId: string;

  @Prop({ required: true })
  residentName: string;

  @Prop({ required: true })
  submittedBy: string;

  @Prop({ enum: REQUEST_STATUS, default: 'pending' })
  status: string;

  @Prop({ required: true })
  time: string;

  @Prop({ type: EditableMemberFields })
  oldValues: EditableMemberFields;

  @Prop({ type: EditableMemberFields })
  newValues: EditableMemberFields;
}
export type MemberEditRequestDocument = MemberEditRequest & Document;
export const MemberEditRequestSchema =
  SchemaFactory.createForClass(MemberEditRequest);

@Schema()
export class NewMemberRequest {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  relation: string;

  @Prop({ required: true })
  dob: string;

  @Prop({ default: '' })
  cccd: string;

  @Prop({ enum: ['male', 'female'], required: true })
  gender: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  fatherName: string;

  @Prop({ default: '' })
  motherName: string;

  @Prop({ default: 'Khác' })
  group: string;

  @Prop({ default: '' })
  permanentAddress: string;

  @Prop({ default: '' })
  temporaryAddress: string;

  @Prop({ required: true })
  familyId: string;

  @Prop({ required: true })
  submittedBy: string;

  @Prop({ enum: REQUEST_STATUS, default: 'pending' })
  status: string;

  @Prop({ required: true })
  time: string;
}
export type NewMemberRequestDocument = NewMemberRequest & Document;
export const NewMemberRequestSchema =
  SchemaFactory.createForClass(NewMemberRequest);
