import { IsString, IsEnum, Matches, Length, IsOptional } from 'class-validator';

export class SendOtpDto {
  @Matches(/^\+8801[3-9]\d{8}$/, {
    message: 'phone must be a valid Bangladeshi number (+8801XXXXXXXXX)',
  })
  phone: string;

  @IsEnum(['login', 'whatsapp_verify'])
  purpose: 'login' | 'whatsapp_verify';
}

export class VerifyOtpDto {
  @IsString()
  requestId: string;

  @Matches(/^\d{6}$/, { message: 'otp must be exactly 6 digits' })
  otp: string;

  @IsString()
  @Length(4, 256)
  deviceFingerprint: string;

  @IsEnum(['android', 'ios', 'web'])
  deviceType: 'android' | 'ios' | 'web';

  @IsOptional()
  @IsString()
  deviceToken?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class VerifyWhatsAppDto {
  @Matches(/^\+8801[3-9]\d{8}$/, {
    message: 'whatsappNumber must be a valid Bangladeshi number',
  })
  whatsappNumber: string;

  @IsString()
  requestId: string;

  @Matches(/^\d{6}$/)
  otp: string;
}

export class RegisterDeviceDto {
  @IsString()
  deviceToken: string;

  @IsEnum(['android', 'ios', 'web'])
  deviceType: 'android' | 'ios' | 'web';

  @IsString()
  deviceFingerprint: string;
}
