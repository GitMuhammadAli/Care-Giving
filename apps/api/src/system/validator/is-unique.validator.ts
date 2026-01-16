import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface IsUniqueValidationArguments extends ValidationArguments {
  constraints: [string, string?, string?]; // [modelName, columnName?, excludeColumn?]
}

@Injectable()
@ValidatorConstraint({ name: 'isUnique', async: true })
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(
    value: any,
    args: IsUniqueValidationArguments,
  ): Promise<boolean> {
    const [modelName, columnName = args.property, excludeColumn = 'id'] = args.constraints;

    try {
      const model = (this.prisma as any)[modelName];
      if (!model) return true;

      const excludeValue = (args.object as any)[excludeColumn];

      const whereCondition: any = { [columnName]: value };

      if (excludeValue) {
        whereCondition[excludeColumn] = { not: excludeValue };
      }

      const existing = await model.findFirst({
        where: whereCondition,
      });

      return !existing;
    } catch {
      return true;
    }
  }

  defaultMessage(args: IsUniqueValidationArguments): string {
    const [modelName, columnName = args.property] = args.constraints;
    return `${columnName} already exists in ${modelName}`;
  }
}

export function IsUnique(
  modelName: string,
  columnName?: string,
  excludeColumn?: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [modelName, columnName, excludeColumn],
      validator: IsUniqueConstraint,
    });
  };
}
