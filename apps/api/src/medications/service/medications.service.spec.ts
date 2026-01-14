// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { MedicationsService } from './medications.service';
import { MedicationRepository } from '../repository/medication.repository';
import { MedicationLogRepository } from '../repository/medication-log.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('MedicationsService', () => {
  let service: MedicationsService;
  let medicationRepository: jest.Mocked<MedicationRepository>;
  let logRepository: jest.Mocked<MedicationLogRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockMedication = {
    id: 'med-123',
    careRecipientId: 'cr-123',
    name: 'Aspirin',
    dosage: '100mg',
    form: 'TABLET',
    frequency: 'ONCE_DAILY',
    times: ['08:00'],
    instructions: 'Take with food',
    startDate: new Date('2024-01-01'),
    endDate: null,
    currentSupply: 30,
    refillThreshold: 7,
    prescriber: 'Dr. Smith',
    pharmacy: 'CVS Pharmacy',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMedicationLog = {
    id: 'log-123',
    medicationId: 'med-123',
    status: 'TAKEN',
    takenAt: new Date(),
    scheduledTime: new Date(),
    loggedById: 'user-123',
    notes: 'Taken with breakfast',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationsService,
        {
          provide: getRepositoryToken(MedicationRepository),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findByCareRecipient: jest.fn(),
            findWithLogs: jest.fn(),
            softRemove: jest.fn(),
            findLowSupply: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MedicationLogRepository),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findByMedication: jest.fn(),
            findByDateRange: jest.fn(),
            getAdherenceStats: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MedicationsService>(MedicationsService);
    medicationRepository = module.get(getRepositoryToken(MedicationRepository));
    logRepository = module.get(getRepositoryToken(MedicationLogRepository));
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new medication', async () => {
      const careRecipientId = 'cr-123';
      const createDto = {
        name: 'Aspirin',
        dosage: '100mg',
        form: 'TABLET' as const,
        frequency: 'ONCE_DAILY' as const,
        scheduledTimes: ['08:00'],
        instructions: 'Take with food',
        startDate: new Date('2024-01-01'),
      };

      medicationRepository.create.mockReturnValue(mockMedication);
      medicationRepository.save.mockResolvedValue(mockMedication);

      const result = await service.create(careRecipientId, createDto);

      expect(result).toEqual(mockMedication);
      expect(medicationRepository.create).toHaveBeenCalled();
      expect(medicationRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('medication.created', mockMedication);
    });
  });

  describe('findOne', () => {
    it('should return a medication by id', async () => {
      medicationRepository.findOne.mockResolvedValue(mockMedication);

      const result = await service.findOne('med-123');

      expect(result).toEqual(mockMedication);
      expect(medicationRepository.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException if medication not found', async () => {
      medicationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all medications for a care recipient', async () => {
      const medications = [mockMedication, { ...mockMedication, id: 'med-456' }];
      medicationRepository.findByCareRecipient.mockResolvedValue(medications);

      const result = await service.findAll('cr-123');

      expect(result).toEqual(medications);
      expect(medicationRepository.findByCareRecipient).toHaveBeenCalledWith('cr-123', true);
    });

    it('should filter by active status when specified', async () => {
      const activeMedications = [mockMedication];
      medicationRepository.findByCareRecipient.mockResolvedValue(activeMedications);

      const result = await service.findAll('cr-123', false);

      expect(result).toEqual(activeMedications);
      expect(medicationRepository.findByCareRecipient).toHaveBeenCalledWith('cr-123', false);
    });
  });

  describe('update', () => {
    it('should update a medication', async () => {
      const updateDto = {
        dosage: '200mg',
        currentSupply: 25,
      };

      const updatedMedication = {
        ...mockMedication,
        ...updateDto,
      };

      medicationRepository.findOne.mockResolvedValue(mockMedication);
      medicationRepository.save.mockResolvedValue(updatedMedication);

      const result = await service.update('med-123', updateDto);

      expect(result).toEqual(updatedMedication);
      expect(medicationRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('medication.updated', updatedMedication);
    });

    it('should throw NotFoundException if medication does not exist', async () => {
      medicationRepository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a medication', async () => {
      medicationRepository.findOne.mockResolvedValue(mockMedication);
      medicationRepository.softRemove.mockResolvedValue(mockMedication);

      await service.remove('med-123');

      expect(medicationRepository.softRemove).toHaveBeenCalledWith(mockMedication);
      expect(eventEmitter.emit).toHaveBeenCalledWith('medication.deleted', { id: 'med-123' });
    });

    it('should throw NotFoundException if medication does not exist', async () => {
      medicationRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('logMedication', () => {
    it('should log medication as given', async () => {
      const logDto = {
        status: 'GIVEN' as const,
        scheduledTime: new Date(),
        notes: 'Taken with breakfast',
      };

      medicationRepository.findOne.mockResolvedValue(mockMedication);
      logRepository.create.mockReturnValue(mockMedicationLog);
      logRepository.save.mockResolvedValue(mockMedicationLog);
      medicationRepository.save.mockResolvedValue({ ...mockMedication, currentSupply: 29 });

      const result = await service.logMedication('med-123', logDto);

      expect(result).toEqual(mockMedicationLog);
      expect(logRepository.create).toHaveBeenCalled();
      expect(logRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('medication.logged', expect.any(Object));
    });

    it('should decrease current supply when medication is given', async () => {
      const logDto = {
        status: 'GIVEN' as const,
        scheduledTime: new Date(),
      };

      medicationRepository.findOne.mockResolvedValue(mockMedication);
      logRepository.create.mockReturnValue(mockMedicationLog);
      logRepository.save.mockResolvedValue(mockMedicationLog);
      medicationRepository.save.mockResolvedValue({
        ...mockMedication,
        currentSupply: 29,
      });

      await service.logMedication('med-123', logDto);

      expect(medicationRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if medication does not exist', async () => {
      const logDto = {
        status: 'GIVEN' as const,
        scheduledTime: new Date(),
      };

      medicationRepository.findOne.mockResolvedValue(null);

      await expect(service.logMedication('invalid-id', logDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLogs', () => {
    it('should return medication logs', async () => {
      const logs = [mockMedicationLog, { ...mockMedicationLog, id: 'log-456' }];
      logRepository.findByMedication.mockResolvedValue(logs);

      const result = await service.getLogs('med-123', 30);

      expect(result).toEqual(logs);
      expect(logRepository.findByMedication).toHaveBeenCalledWith('med-123', 30);
    });
  });
});
