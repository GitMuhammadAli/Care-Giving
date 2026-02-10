import { IsString, IsNotEmpty, IsEnum, IsArray, IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicationForm, MedicationFrequency } from '@prisma/client';

// ─── Normalize helpers ────────────────────────────────────────────────────────
// The frontend <select> can send labels ("Twice daily"), lowercase ("capsule"),
// or correct enum values ("CAPSULE"). These maps handle every variation so the
// API never rejects valid user input.

const FORM_LABEL_MAP: Record<string, MedicationForm> = {};
const FORM_ENTRIES: Array<[string, MedicationForm]> = [
  ['tablet', MedicationForm.TABLET],
  ['capsule', MedicationForm.CAPSULE],
  ['liquid', MedicationForm.LIQUID],
  ['injection', MedicationForm.INJECTION],
  ['patch', MedicationForm.PATCH],
  ['cream', MedicationForm.CREAM],
  ['inhaler', MedicationForm.INHALER],
  ['drops', MedicationForm.DROPS],
  ['other', MedicationForm.OTHER],
];
for (const [label, value] of FORM_ENTRIES) {
  FORM_LABEL_MAP[label] = value;                      // "tablet"  → TABLET
  FORM_LABEL_MAP[label.toUpperCase()] = value;         // "TABLET"  → TABLET
  FORM_LABEL_MAP[label[0].toUpperCase() + label.slice(1)] = value; // "Tablet" → TABLET
}

const FREQ_LABEL_MAP: Record<string, MedicationFrequency> = {};
const FREQ_ENTRIES: Array<[string[], MedicationFrequency]> = [
  [['daily', 'once daily', 'once a day', '1x daily'], MedicationFrequency.DAILY],
  [['twice daily', 'twice a day', '2x daily', 'twice_daily'], MedicationFrequency.TWICE_DAILY],
  [['three times daily', 'three times a day', '3x daily', 'three_times_daily'], MedicationFrequency.THREE_TIMES_DAILY],
  [['four times daily', 'four times a day', '4x daily', 'four_times_daily'], MedicationFrequency.FOUR_TIMES_DAILY],
  [['weekly', 'once weekly', 'once a week'], MedicationFrequency.WEEKLY],
  [['as needed', 'as_needed', 'prn'], MedicationFrequency.AS_NEEDED],
  [['other', 'custom', 'other / custom'], MedicationFrequency.OTHER],
];
for (const [labels, value] of FREQ_ENTRIES) {
  for (const label of labels) {
    FREQ_LABEL_MAP[label] = value;                     // "twice daily"   → TWICE_DAILY
    FREQ_LABEL_MAP[label.toUpperCase()] = value;       // "TWICE DAILY"   → TWICE_DAILY
  }
  // Also map the enum value itself (e.g. "TWICE_DAILY" → TWICE_DAILY)
  FREQ_LABEL_MAP[value] = value;
}

function normalizeForm(raw: unknown): MedicationForm | unknown {
  if (typeof raw !== 'string') return raw;
  return FORM_LABEL_MAP[raw] || FORM_LABEL_MAP[raw.toLowerCase()] || FORM_LABEL_MAP[raw.toUpperCase()] || raw;
}

function normalizeFrequency(raw: unknown): MedicationFrequency | unknown {
  if (typeof raw !== 'string') return raw;
  return FREQ_LABEL_MAP[raw] || FREQ_LABEL_MAP[raw.toLowerCase()] || FREQ_LABEL_MAP[raw.toUpperCase()] || raw;
}

// ─── DTO ──────────────────────────────────────────────────────────────────────

export class CreateMedicationDto {
  @ApiProperty({ description: 'Medication name', example: 'Lisinopril' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Generic name of the medication', example: 'Lisinopril' })
  @IsString()
  @IsOptional()
  genericName?: string;

  @ApiProperty({ description: 'Dosage amount and unit', example: '10mg' })
  @IsString()
  @IsNotEmpty()
  dosage: string;

  @ApiProperty({
    description: 'Form of medication',
    enum: MedicationForm,
    example: 'TABLET',
  })
  @Transform(({ value }) => normalizeForm(value))
  @IsEnum(MedicationForm)
  form: MedicationForm;

  @ApiProperty({
    description: 'How often to take the medication',
    enum: MedicationFrequency,
    example: 'DAILY',
  })
  @Transform(({ value }) => normalizeFrequency(value))
  @IsEnum(MedicationFrequency)
  frequency: MedicationFrequency;

  @ApiPropertyOptional({ description: 'Number of times per day', example: 2, minimum: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  timesPerDay?: number;

  @ApiPropertyOptional({
    description: 'Scheduled times to take medication',
    example: ['08:00', '20:00'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scheduledTimes?: string[];

  @ApiPropertyOptional({ description: 'Special instructions', example: 'Take with food' })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Prescribing doctor name', example: 'Dr. Smith' })
  @IsString()
  @IsOptional()
  prescribedBy?: string;

  @ApiPropertyOptional({ description: 'Pharmacy name', example: 'CVS Pharmacy' })
  @IsString()
  @IsOptional()
  pharmacy?: string;

  @ApiPropertyOptional({ description: 'Pharmacy phone number', example: '+1-555-123-4567' })
  @IsString()
  @IsOptional()
  pharmacyPhone?: string;

  @ApiPropertyOptional({ description: 'Current supply count', example: 30, minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  currentSupply?: number;

  @ApiPropertyOptional({ description: 'Supply count to trigger refill alert', example: 7, minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  refillAt?: number;

  @ApiPropertyOptional({ description: 'When to start medication', example: '2024-03-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'When to stop medication', example: '2024-06-01' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'For blood pressure control' })
  @IsString()
  @IsOptional()
  notes?: string;
}
