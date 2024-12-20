import {
  Controller,
  Get,
  NotFoundException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { ApiBearerAuth, ApiProperty, ApiResponse } from '@nestjs/swagger';
import { AdminOrStaffGuard } from 'src/auth/admin-or-staff.guard';

export class User {
  @ApiProperty({ example: 1, description: 'The unique identifier of the user' })
  id: string;

  @ApiProperty({ example: 'johndoe', description: 'The username of the user' })
  username: string;

  @ApiProperty({ example: true, description: 'is user admin' })
  isAdmin: boolean;

  @ApiProperty({ example: 'FreeUser', description: 'The type of the user' })
  discriminator: string;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: User,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async getProfile(@Request() req): Promise<User> {
    const user = await this.usersService.findOne(req.user.username);
    if (!user) {
      throw new NotFoundException();
    }
    const res = new User();
    res.id = user.id;
    res.username = user.username;
    res.discriminator = user.discriminator;
    res.isAdmin = user.isAdmin;

    return res;
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: Array<User>,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, AdminOrStaffGuard)
  @Get('/all')
  async getAll(): Promise<User[]> {
    const users = await this.usersService.all();

    return users.map((user) => {
      const res = new User();
      res.id = user.id;
      res.username = user.username;
      res.isAdmin = user.isAdmin;
      res.discriminator = user.discriminator;

      return res;
    });
  }
}
