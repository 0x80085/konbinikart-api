import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class InviteCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn()
  usedBy: User;

  @Column({ nullable: true })
  usedById: string;
}
