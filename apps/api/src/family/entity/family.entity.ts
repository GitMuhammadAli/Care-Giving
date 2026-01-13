import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { FamilyMember } from './family-member.entity';
import { FamilyInvitation } from './family-invitation.entity';
import { CareRecipient } from '../../care-recipient/entity/care-recipient.entity';

@Entity('families')
export class Family extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  settings?: {
    timezone: string;
    notificationsEnabled: boolean;
    emergencyContacts: Array<{
      name: string;
      phone: string;
      relationship: string;
    }>;
  };

  @OneToMany(() => FamilyMember, (member) => member.family)
  members: FamilyMember[];

  @OneToMany(() => FamilyInvitation, (invitation) => invitation.family)
  invitations: FamilyInvitation[];

  @OneToMany(() => CareRecipient, (recipient) => recipient.family)
  careRecipients: CareRecipient[];
}

