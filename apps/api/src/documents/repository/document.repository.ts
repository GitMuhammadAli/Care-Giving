import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Document, DocumentCategory } from '../entity/document.entity';

@Injectable()
export class DocumentRepository extends Repository<Document> {
  constructor(private dataSource: DataSource) {
    super(Document, dataSource.createEntityManager());
  }

  async findByCareRecipient(careRecipientId: string): Promise<Document[]> {
    return this.find({
      where: { careRecipientId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCategory(
    careRecipientId: string,
    category: DocumentCategory,
  ): Promise<Document[]> {
    return this.find({
      where: { careRecipientId, category },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findExpiringDocuments(careRecipientId: string, daysAhead = 30): Promise<Document[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.createQueryBuilder('document')
      .where('document.careRecipientId = :careRecipientId', { careRecipientId })
      .andWhere('document.expirationDate IS NOT NULL')
      .andWhere('document.expirationDate <= :futureDate', { futureDate })
      .andWhere('document.expirationDate >= :now', { now: new Date() })
      .orderBy('document.expirationDate', 'ASC')
      .getMany();
  }
}

