import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class UsersService {
  async findOne(username: string): Promise<any> {
    throw new NotImplementedException();
  }
}
