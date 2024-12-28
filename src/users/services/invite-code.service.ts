import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteCode } from '../entities/invite-code.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class InviteCodeService {
  constructor(
    @InjectRepository(InviteCode)
    private readonly inviteCodeRepository: Repository<InviteCode>,
  ) {}

  async createInviteCode(): Promise<InviteCode> {
    const code = new InviteCode();
    code.code = Math.random().toString(36).substr(2, 8); // Generate random code
    return this.inviteCodeRepository.save(code);
  }
  async all(): Promise<InviteCode[]> {
    return this.inviteCodeRepository.find();
  }

  async revokeInviteCode(code: string): Promise<void> {
    const invite = await this.inviteCodeRepository.findOne({ where: { code } });
    if (invite) {
      invite.isActive = false;
      await this.inviteCodeRepository.save(invite);
    }
  }

  async validateInviteCode(code: string): Promise<InviteCode> {
    return this.inviteCodeRepository.findOne({
      where: { code, isActive: true },
    });
  }

  async markAsUsed(user: User, invite: InviteCode) {
    invite.isActive = false;
    invite.usedBy = user;

    await this.inviteCodeRepository.save(invite);
  }
}
