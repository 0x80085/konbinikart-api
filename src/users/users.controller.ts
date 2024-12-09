import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UsersService } from './users.service';
// import { User } from './user.entity';
import { ApiBearerAuth, ApiProperty, ApiResponse } from '@nestjs/swagger';

export class User {
  @ApiProperty({ example: 1, description: 'The unique identifier of the user' })
  id: number;

  @ApiProperty({ example: 'johndoe', description: 'The username of the user' })
  username: string;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @ApiBearerAuth() // Indicates that this endpoint requires a JWT token
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
    const res = new User();
    res.id = user.id;
    res.username = user.username;

    return res;
  }
}
