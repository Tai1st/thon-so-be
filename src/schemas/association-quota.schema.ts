import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema({ _id: false })
class BankInfo {
  @Prop({ default: '' }) bankName: string;
  @Prop({ default: '' }) accountNumber: string;
  @Prop({ default: '' }) accountHolder: string;
}

@Schema({ _id: false })
class Transaction {
  @Prop({ required: true }) id: string;
  @Prop({ enum: ['Thu', 'Chi'], required: true }) type: string;
  @Prop({ required: true }) desc: string;
  @Prop() member?: string;
  @Prop({ required: true }) amount: number;
  @Prop({ required: true }) date: string;
  @Prop() officer?: string;
}

@Schema({ _id: false })
class Loan {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) memberName: string;
  @Prop({ required: true }) amount: number;
  @Prop({ required: true }) date: string;
  @Prop({ required: true }) status: string;
  @Prop() note?: string;
}

@Schema({ _id: false })
class FeeObligation {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) amount: number;
  @Prop({ required: true }) period: string;
}

@Schema()
export class AssociationQuota {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // vd "Hội Nông dân"

  @Prop({ default: 0 })
  balance: number;

  @Prop({ type: [Transaction], default: [] })
  txs: Transaction[];

  @Prop({ type: [Loan], default: [] })
  loans: Loan[];

  @Prop({ type: BankInfo, default: {} })
  bankInfo: BankInfo;

  @Prop({ type: [FeeObligation], default: [] })
  feeObligations: FeeObligation[];

  @Prop({ type: Map, of: Object, default: {} })
  memberFunds: Map<string, unknown>; // keyed by resident id
}

export type AssociationQuotaDocument = AssociationQuota & Document;
export const AssociationQuotaSchema =
  SchemaFactory.createForClass(AssociationQuota);
AssociationQuotaSchema.index({ tenantId: 1, name: 1 }, { unique: true });
