import { IsNotEmpty, IsString } from 'class-validator';

// File KMZ được gửi kèm dạng multipart (field "file"), tên xã gửi dạng
// field text thường trong cùng FormData — không đi qua class-validator
// chung với JSON body như các DTO khác nên chỉ khai báo phần "name".
export class ImportCommuneDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
