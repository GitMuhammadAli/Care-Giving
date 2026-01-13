import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { DataSource, Not } from 'typeorm';

interface IsUniqueValidationArguments extends ValidationArguments {
  constraints: [string, string?, string?]; // [entityName, columnName?, excludeColumn?]
}

@Injectable()
@ValidatorConstraint({ name: 'isUnique', async: true })
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private dataSource: DataSource) {}

  async validate(
    value: any,
    args: IsUniqueValidationArguments,
  ): Promise<boolean> {
    const [entityName, columnName = args.property, excludeColumn = 'id'] = args.constraints;

    const repository = this.dataSource.getRepository(entityName);

    const excludeValue = (args.object as any)[excludeColumn];

    const whereCondition: any = { [columnName]: value };

    if (excludeValue) {
      whereCondition[excludeColumn] = Not(excludeValue);
    }

    const existing = await repository.findOne({
      where: whereCondition,
      withDeleted: false,
    });

    return !existing;
  }

  defaultMessage(args: IsUniqueValidationArguments): string {
    const [entityName, columnName = args.property] = args.constraints;
    return `${columnName} already exists in ${entityName}`;
  }
}

export function IsUnique(
  entityName: string,
  columnName?: string,
  excludeColumn?: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entityName, columnName, excludeColumn],
      validator: IsUniqueConstraint,
    });
  };
}

