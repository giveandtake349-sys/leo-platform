// create-company.dto.ts
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString() @MaxLength(120) companyName: string;
  @IsString() @MaxLength(120) ownerName: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() division?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() thana?: string;
  @IsOptional() @IsString() village?: string;
  @IsOptional() @IsNumber() locationLat?: number;
  @IsOptional() @IsNumber() locationLng?: number;
}

export class UpdateCompanyDto extends CreateCompanyDto {}
