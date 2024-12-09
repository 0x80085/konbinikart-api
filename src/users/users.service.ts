import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserDiscriminator } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}
  async findOne(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async all(): Promise<User[] | undefined> {
    return this.usersRepository.find();
  }

  async create(username: string, password: string): Promise<any> {
    const exists = await this.usersRepository.exists({ where: { username } });
    if (exists) {
      throw new ConflictException('Username taken');
    }
    const count = await this.usersRepository.count();
    let isAdmin = false;
    if (count === 0) {
      isAdmin = true;
    }
    const user = this.usersRepository.create({
      username,
      password,
      discriminator: UserDiscriminator.Staff, // todo
      isAdmin: isAdmin,
      resourceUseCount: 0,
    });

    this.usersRepository.save(user);
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

    user.resourceUseCount = (user.resourceUseCount || 0) + 1;

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
}
