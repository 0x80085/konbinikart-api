import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserDiscriminator } from './user.entity';
import { InviteCodeService } from './invite-code.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  resourceUseLimit: number;
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly inviteCodeService: InviteCodeService,
    private readonly config: ConfigService,
  ) {
    this.resourceUseLimit = config.get<number>('RESOURCE_USE_LIMIT');
  }
  async findOne(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async all(): Promise<User[] | undefined> {
    return this.usersRepository.find();
  }

  async create(
    username: string,
    password: string,
    inviteCode: string,
  ): Promise<any> {
    const invite = await this.inviteCodeService.validateInviteCode(inviteCode);

    if (!invite) {
      throw new BadRequestException('Invalid or inactive invite code');
    }

    const exists = await this.usersRepository.exists({ where: { username } });
    if (exists) {
      throw new ConflictException('Username taken');
    }
    const count = await this.usersRepository.count();
    let isAdmin = false;
    if (count === 0) {
      isAdmin = true;
    }

    // todo register which invitecode was used
    const user = this.usersRepository.create({
      username,
      password,
      discriminator: UserDiscriminator.Staff, // todo
      isAdmin: isAdmin,
      resourceUseCount: 0,
    });

    const savedUser = await this.usersRepository.save(user);

    await this.inviteCodeService.markAsUsed(savedUser, invite);
  }

  /**
   * Increment the resource use count for a specific user.
   * @param userId The ID of the user whose count should be increased.
   */
  async increaseResourceUseCountFor(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
    await this.updateResourceLimit(user);

    await this.usersRepository.save(user);
  }

  /**
   * Reset the resource use count for a specific user.
   * @param userId The ID of the user whose count should be reset.
   */
  async resetResourceUseCountFor(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    user.resourceUseCount = 0;

    await this.usersRepository.save(user);
  }

  private async updateResourceLimit(user: User): Promise<boolean> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    if (!user.lastResourceUse || user.lastResourceUse < oneHourAgo) {
      user.resourceUseCount = 0; // Reset count if last usage was more than an hour ago
    }

    if (user.resourceUseCount >= this.resourceUseLimit) {
      return false; // Limit reached
    }

    user.resourceUseCount++;
    user.lastResourceUse = now;
    await this.usersRepository.save(user);

    return true;
  }
}
