import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum UserDiscriminator {
  Staff = 'Staff',
  FreeUser = 'FreeUser',
  PremiumUser = 'PremiumUser',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  discriminator: string;

  @Column()
  isAdmin: boolean;

  @Column()
  password: string;

  @Column()
  resourceUseCount: number;
}
