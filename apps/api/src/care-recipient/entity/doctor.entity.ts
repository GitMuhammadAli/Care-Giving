import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { CareRecipient } from './care-recipient.entity';

@Entity('doctors')
@Index(['careRecipientId'])
export class Doctor extends BaseEntity {
  @Column({ type: 'uuid' })
  careRecipientId: string;

  @ManyToOne(() => CareRecipient, (recipient) => recipient.doctors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'care_recipient_id' })
  careRecipient: CareRecipient;

  @Column()
  name: string;

  @Column({ nullable: true })
  specialty?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  fax?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  practice?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column({ default: false })
  isPrimary: boolean;
}

