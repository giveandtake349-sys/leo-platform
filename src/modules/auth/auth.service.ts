import {
  Injectable, BadRequestException, UnauthorizedException,
  HttpException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  OtpRequestEntity,
  SessionEntity,
  DeviceEntity,
} from './entities/otp-request.entity';
import { UserEntity } from './entities/user.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { encrypt, hashForLookup } from '../../common/utils/crypto.util';
import {
  SendOtpDto, VerifyOtpDto, RefreshTokenDto,
  VerifyWhatsAppDto, RegisterDeviceDto,
} from './dto/auth.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(OtpRequestEntity) private otpRepo: Repository<OtpRequestEntity>,
    @InjectRepository(SessionEntity) private sessionRepo: Repository<SessionEntity>,
    @InjectRepository(DeviceEntity) private deviceRepo: Repository<DeviceEntity>,
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
    @InjectRepository(WalletEntity) private walletRepo: Repository<WalletEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async sendOtp(
    dto: SendOtpDto,
    ip: string,
  ): Promise<{ requestId: string; expiresInSeconds: number }> {
    const phoneHash = hashForLookup(dto.phone);
    const recentCount = await this.otpRepo
      .createQueryBuilder('o')
      .where('o.phone_hash = :h', { h: phoneHash })
      .andWhere(`o.created_at > NOW() - INTERVAL '1 hour'`)
      .getCount();

    const rateLimit = this.config.get<number>('OTP_RATE_LIMIT_PER_HOUR', 5);
    if (recentCount >= rateLimit) {
      throw new HttpException('Too many OTP requests. Please try again later.', 429);
    }

    const otpPlain = randomInt(100000, 999999).toString();
    const ttl = this.config.get<number>('OTP_TTL_SECONDS', 300);
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const otpHash = this.hashValue(otpPlain);

    const req = this.otpRepo.create({
      phoneHash,
      otpHash,
      purpose: dto.purpose,
      expiresAt,
      ipAddress: ip,
    });
    await this.otpRepo.save(req);

    if (this.config.get('NODE_ENV') !== 'production') {
      console.log(`[OTP-DEV] ${dto.phone} → ${otpPlain}`);
    }

    return { requestId: req.id, expiresInSeconds: ttl };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: Partial<UserEntity>;
  }> {
    const req = await this.otpRepo.findOne({ where: { id: dto.requestId } });
    if (!req) throw new BadRequestException('OTP request not found');
    if (req.isVerified) throw new BadRequestException('OTP already used');
    if (new Date() > req.expiresAt) {
      throw new BadRequestException({ code: 'AUTH_OTP_EXPIRED', message: 'OTP expired' });
    }
    if (req.attemptCount >= req.maxAttempts) {
      throw new HttpException({
        code: 'AUTH_OTP_MAX_ATTEMPTS',
        message: 'Max OTP attempts reached',
      });
    }

    if (this.hashValue(dto.otp) !== req.otpHash) {
      await this.otpRepo.increment({ id: req.id }, 'attemptCount', 1);
      throw new BadRequestException({ code: 'AUTH_OTP_INVALID', message: 'Invalid OTP' });
    }

    await this.otpRepo.update(req.id, { isVerified: true, verifiedAt: new Date() });

    let user = await this.userRepo.findOne({ where: { phoneHash: req.phoneHash } });
    if (!user) {
      user = await this.dataSource.transaction(async (em) => {
        const newUser = em.create(UserEntity, {
          phoneHash: req.phoneHash,
          phoneEncrypted: encrypt(req.phoneHash),
          role: 'worker',
          isPhoneVerified: true,
        });
        await em.save(newUser);
        const wallet = em.create(WalletEntity, { userId: newUser.id });
        await em.save(wallet);
        return newUser;
      });
    } else {
      if (user.status === 'suspended') {
        throw new ForbiddenException({
          code: 'AUTH_USER_SUSPENDED',
          message: 'Account suspended',
        });
      }
      await this.userRepo.update(user.id, {
        isPhoneVerified: true,
        lastLoginAt: new Date(),
      });
    }

    if (dto.deviceToken) {
      await this.deviceRepo.upsert(
        {
          userId: user.id,
          deviceToken: dto.deviceToken,
          deviceType: dto.deviceType,
          deviceFingerprint: dto.deviceFingerprint,
          lastSeenAt: new Date(),
        },
        ['userId', 'deviceToken'],
      );
    }

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string; expiresIn: number }> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_INVALID',
        message: 'Invalid refresh token',
      });
    }

    const session = await this.sessionRepo.findOne({ where: { jwtId: payload.jti } });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_REVOKED',
        message: 'Session revoked',
      });
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || user.status !== 'active') throw new UnauthorizedException('User inactive');

    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role, jti: session.jwtId },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      },
    );

    return { accessToken, expiresIn: 900 };
  }

  async logout(jwtId: string): Promise<void> {
    await this.sessionRepo.update({ jwtId }, { revokedAt: new Date() });
  }

  async verifyWhatsApp(userId: string, dto: VerifyWhatsAppDto): Promise<void> {
    const req = await this.otpRepo.findOne({
      where: { id: dto.requestId, purpose: 'whatsapp_verify' },
    });
    if (!req || req.isVerified || new Date() > req.expiresAt) {
      throw new BadRequestException('Invalid or expired WhatsApp OTP');
    }
    if (this.hashValue(dto.otp) !== req.otpHash) {
      throw new BadRequestException({ code: 'AUTH_OTP_INVALID', message: 'Invalid OTP' });
    }

    await this.otpRepo.update(req.id, { isVerified: true, verifiedAt: new Date() });
    await this.userRepo.update(userId, {
      whatsappEncrypted: encrypt(dto.whatsappNumber),
      whatsappHash: hashForLookup(dto.whatsappNumber),
      isWhatsappVerified: true,
    });
  }

  async registerDevice(userId: string, dto: RegisterDeviceDto): Promise<void> {
    await this.deviceRepo.upsert(
      {
        userId,
        deviceToken: dto.deviceToken,
        deviceType: dto.deviceType,
        deviceFingerprint: dto.deviceFingerprint,
        lastSeenAt: new Date(),
      },
      ['userId', 'deviceToken'],
    );
  }

  private async issueTokens(user: UserEntity) {
    const jti = uuidv4();
    const payload: JwtPayload = { sub: user.id, role: user.role, jti };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    await this.sessionRepo.save(
      this.sessionRepo.create({
        userId: user.id,
        jwtId: jti,
        refreshTokenHash: this.hashValue(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      }),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        isWhatsappVerified: user.isWhatsappVerified,
      },
    };
  }

  private hashValue(value: string): string {
    return createHmac('sha256', this.config.get('JWT_SECRET', 'fallback'))
      .update(value)
      .digest('hex');
  }
}
