import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { CareRecipient } from './care-recipient.entity';

@Entity('emergency_contacts')
@Index(['careRecipientId'])
export class EmergencyContact extends BaseEntity {
  @Column({ type: 'uuid' })
  careRecipientId: string;

  @ManyToOne(() => CareRecipient, (recipient) => recipient.emergencyContacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'care_recipient_id' })
  careRecipient: CareRecipient;

  @Column()
  name: string;

  @Column()
  relationship: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  alternatePhone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ default: 1 })
  priority: number;

  @Column({ nullable: true })
  notes?: string;
}

