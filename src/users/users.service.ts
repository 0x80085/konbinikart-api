import { ConflictException, Injectable } from '@nestjs/common';
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
    });

    this.usersRepository.save(user);
  }
}
