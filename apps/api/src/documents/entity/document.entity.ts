import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { CareRecipient } from '../../care-recipient/entity/care-recipient.entity';
import { User } from '../../user/entity/user.entity';

export enum DocumentCategory {
  MEDICAL_RECORD = 'medical_record',
  LAB_RESULT = 'lab_result',
  PRESCRIPTION = 'prescription',
  INSURANCE = 'insurance',
  LEGAL = 'legal',
  ID = 'id',
  IMAGE = 'image',
  OTHER = 'other',
}

@Entity('documents')
@Index(['careRecipientId', 'category'])
export class Document extends BaseEntity {
  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: DocumentCategory,
    default: DocumentCategory.OTHER,
  })
  category: DocumentCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  fileName: string;

  @Column()
  fileUrl: string;

  @Column()
  fileType: string;

  @Column({ type: 'int' })
  fileSize: number;

  @Column({ nullable: true })
  storageKey: string; // For S3/Cloudinary reference

  @Column({ type: 'date', nullable: true })
  expirationDate: Date;

  @Column({ default: false })
  isEncrypted: boolean;

  @Column()
  careRecipientId: string;

  @ManyToOne(() => CareRecipient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'careRecipientId' })
  careRecipient: CareRecipient;

  @Column()
  uploadedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;
}

