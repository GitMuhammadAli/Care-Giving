import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface IsExistsValidationArguments extends ValidationArguments {
  constraints: [string, string?]; // [entityName, columnName?]
}

@Injectable()
@ValidatorConstraint({ name: 'isExists', async: true })
export class IsExistsConstraint implements ValidatorConstraintInterface {
  constructor(private dataSource: DataSource) {}

  async validate(
    value: any,
    args: IsExistsValidationArguments,
  ): Promise<boolean> {
    if (!value) return true; // Let @IsNotEmpty handle empty values

    const [entityName, columnName = 'id'] = args.constraints;

    const repository = this.dataSource.getRepository(entityName);

    const existing = await repository.findOne({
      where: { [columnName]: value },
      withDeleted: false,
    });

    return !!existing;
  }

  defaultMessage(args: IsExistsValidationArguments): string {
    const [entityName, columnName = 'id'] = args.constraints;
    return `${entityName} with this ${columnName} does not exist`;
  }
}

export function IsExists(
  entityName: string,
  columnName?: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entityName, columnName],
      validator: IsExistsConstraint,
    });
  };
}

