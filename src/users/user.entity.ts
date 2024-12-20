import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum UserDiscriminator {
  Staff = 'Staff',
  FreeUser = 'FreeUser',
  PremiumUser = 'PremiumUser',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  discriminator: string;

  @Column({ default: false })
  isAdmin: boolean;

  @Column()
  password: string;

  @Column({ default: 0 })
  resourceUseCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastResourceUse: Date;
}
