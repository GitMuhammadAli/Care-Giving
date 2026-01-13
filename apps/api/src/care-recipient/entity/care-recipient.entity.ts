import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../system/entity/base.entity';
import { Family } from '../../family/entity/family.entity';

export enum BloodType {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
}

@Entity('care_recipients')
@Index(['familyId'])
export class CareRecipient extends BaseEntity {
  @Column({ type: 'uuid' })
  familyId: string;

  @ManyToOne(() => Family, (family) => family.careRecipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  preferredName?: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ type: 'enum', enum: BloodType, nullable: true })
  bloodType?: BloodType;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: 'simple-array', nullable: true })
  allergies?: string[];

  @Column({ type: 'simple-array', nullable: true })
  conditions?: string[];

  @Column({ nullable: true })
  notes?: string;

  @Column({ nullable: true })
  preferredHospital?: string;

  @Column({ nullable: true })
  preferredHospitalAddress?: string;

  @Column({ nullable: true })
  insuranceProvider?: string;

  @Column({ nullable: true })
  insurancePolicyNumber?: string;

  @Column({ nullable: true })
  insuranceGroupNumber?: string;

  @Column({ nullable: true })
  medicareNumber?: string;

  @Column({ nullable: true })
  medicaidNumber?: string;

  @Column({ type: 'jsonb', nullable: true })
  additionalInfo?: Record<string, any>;

  @OneToMany('Doctor', 'careRecipient')
  doctors: any[];

  @OneToMany('EmergencyContact', 'careRecipient')
  emergencyContacts: any[];

  @OneToMany('Medication', 'careRecipient')
  medications: any[];

  @OneToMany('Appointment', 'careRecipient')
  appointments: any[];

  getAge(): number | null {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}

