import { ColumnSchema } from '../../core/schema-engine';
import { DataRow } from '../types';

/**
 * GeneratorService
 *
 * Handles data generation logic for creating synthetic datasets.
 * Supports sequence generators (integer, date) and random generators (number, date).
 */

export type GeneratorType =
  | 'integerSequence'
  | 'dateSequence'
  | 'randomNumber'
  | 'randomDate'
  | 'randomBoolean'
  | 'randomCategory';

export interface ColumnGenerator {
  name: string;
  type: GeneratorType;
  config: GeneratorConfig;
}

export type GeneratorConfig =
  | IntegerSequenceConfig
  | DateSequenceConfig
  | RandomNumberConfig
  | RandomDateConfig
  | RandomBooleanConfig
  | RandomCategoryConfig;

export interface IntegerSequenceConfig {
  type: 'integerSequence';
  start: number;
  step: number;
}

export interface DateSequenceConfig {
  type: 'dateSequence';
  start: string; // ISO date string
  increment: number;
  unit: 'days' | 'weeks' | 'months' | 'years';
}

export interface RandomNumberConfig {
  type: 'randomNumber';
  min: number;
  max: number;
  decimals: number;
}

export interface RandomDateConfig {
  type: 'randomDate';
  from: string; // ISO date string
  to: string; // ISO date string
}

export interface RandomBooleanConfig {
  type: 'randomBoolean';
  trueProbability: number; // 0-1
}

export interface RandomCategoryConfig {
  type: 'randomCategory';
  values: string[];
  weights?: number[]; // Optional weights, if not provided, uniform distribution
}

export class GeneratorService {
  /**
   * Generate a dataset with the specified columns and row count
   */
  static generate(
    rowCount: number,
    generators: ColumnGenerator[]
  ): {
    columns: ColumnSchema[];
    data: DataRow[];
  } {
    if (generators.length === 0) {
      throw new Error('At least one column generator is required');
    }

    if (rowCount <= 0) {
      throw new Error('Row count must be greater than 0');
    }

    if (rowCount > 100000) {
      throw new Error('Row count cannot exceed 100,000 rows');
    }

    // Generate schema
    const columns: ColumnSchema[] = generators.map((gen) => ({
      name: gen.name,
      type: this.getColumnType(gen.config),
    }));

    // Generate data
    const data: DataRow[] = [];
    for (let i = 0; i < rowCount; i++) {
      const row: DataRow = {};
      for (const gen of generators) {
        row[gen.name] = this.generateValue(gen.config, i);
      }
      data.push(row);
    }

    return { columns, data };
  }

  /**
   * Get the column type for a generator config
   */
  private static getColumnType(config: GeneratorConfig): ColumnSchema['type'] {
    switch (config.type) {
      case 'integerSequence':
        return 'integer';
      case 'dateSequence':
      case 'randomDate':
        return 'date';
      case 'randomNumber':
        return config.decimals === 0 ? 'integer' : 'float';
      case 'randomBoolean':
        return 'boolean';
      case 'randomCategory':
        return 'string';
      default:
        return 'string';
    }
  }

  /**
   * Generate a single value for a given generator config and row index
   */
  private static generateValue(config: GeneratorConfig, rowIndex: number): any {
    switch (config.type) {
      case 'integerSequence':
        return this.generateIntegerSequence(config, rowIndex);
      case 'dateSequence':
        return this.generateDateSequence(config, rowIndex);
      case 'randomNumber':
        return this.generateRandomNumber(config);
      case 'randomDate':
        return this.generateRandomDate(config);
      case 'randomBoolean':
        return this.generateRandomBoolean(config);
      case 'randomCategory':
        return this.generateRandomCategory(config);
      default:
        return null;
    }
  }

  /**
   * Integer Sequence Generator
   */
  private static generateIntegerSequence(config: IntegerSequenceConfig, rowIndex: number): number {
    return config.start + config.step * rowIndex;
  }

  /**
   * Date Sequence Generator
   */
  private static generateDateSequence(config: DateSequenceConfig, rowIndex: number): string {
    const date = new Date(config.start);

    switch (config.unit) {
      case 'days':
        date.setDate(date.getDate() + config.increment * rowIndex);
        break;
      case 'weeks':
        date.setDate(date.getDate() + config.increment * rowIndex * 7);
        break;
      case 'months':
        date.setMonth(date.getMonth() + config.increment * rowIndex);
        break;
      case 'years':
        date.setFullYear(date.getFullYear() + config.increment * rowIndex);
        break;
    }

    // Return ISO date string (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  }

  /**
   * Random Number Generator
   */
  private static generateRandomNumber(config: RandomNumberConfig): number {
    const random = Math.random() * (config.max - config.min) + config.min;
    if (config.decimals === 0) {
      return Math.floor(random);
    }
    return parseFloat(random.toFixed(config.decimals));
  }

  /**
   * Random Date Generator
   */
  private static generateRandomDate(config: RandomDateConfig): string {
    const fromTime = new Date(config.from).getTime();
    const toTime = new Date(config.to).getTime();
    const randomTime = fromTime + Math.random() * (toTime - fromTime);
    const date = new Date(randomTime);
    // Return ISO date string (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  }

  /**
   * Random Boolean Generator
   */
  private static generateRandomBoolean(config: RandomBooleanConfig): boolean {
    return Math.random() < config.trueProbability;
  }

  /**
   * Random Category Generator
   */
  private static generateRandomCategory(config: RandomCategoryConfig): string {
    if (config.values.length === 0) {
      return '';
    }

    // If weights are provided, use weighted random selection
    if (config.weights && config.weights.length === config.values.length) {
      const totalWeight = config.weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < config.values.length; i++) {
        random -= config.weights[i];
        if (random <= 0) {
          return config.values[i];
        }
      }
      // Fallback to last value if rounding errors occur
      return config.values[config.values.length - 1];
    }

    // Uniform distribution
    const index = Math.floor(Math.random() * config.values.length);
    return config.values[index];
  }

  /**
   * Validate generator configuration
   */
  static validateGenerator(gen: ColumnGenerator): string | null {
    if (!gen.name || gen.name.trim() === '') {
      return 'Column name cannot be empty';
    }

    switch (gen.config.type) {
      case 'integerSequence': {
        const config = gen.config as IntegerSequenceConfig;
        if (config.step === 0) {
          return 'Step cannot be zero';
        }
        break;
      }
      case 'dateSequence': {
        const config = gen.config as DateSequenceConfig;
        if (isNaN(new Date(config.start).getTime())) {
          return 'Invalid start date';
        }
        if (config.increment === 0) {
          return 'Increment cannot be zero';
        }
        break;
      }
      case 'randomNumber': {
        const config = gen.config as RandomNumberConfig;
        if (config.min >= config.max) {
          return 'Min must be less than max';
        }
        if (config.decimals < 0 || config.decimals > 10) {
          return 'Decimals must be between 0 and 10';
        }
        break;
      }
      case 'randomDate': {
        const config = gen.config as RandomDateConfig;
        const fromTime = new Date(config.from).getTime();
        const toTime = new Date(config.to).getTime();
        if (isNaN(fromTime) || isNaN(toTime)) {
          return 'Invalid date range';
        }
        if (fromTime >= toTime) {
          return 'From date must be before to date';
        }
        break;
      }
      case 'randomBoolean': {
        const config = gen.config as RandomBooleanConfig;
        if (config.trueProbability < 0 || config.trueProbability > 1) {
          return 'Probability must be between 0 and 1';
        }
        break;
      }
      case 'randomCategory': {
        const config = gen.config as RandomCategoryConfig;
        if (config.values.length === 0) {
          return 'At least one category value is required';
        }
        if (config.weights && config.weights.length !== config.values.length) {
          return 'Number of weights must match number of values';
        }
        if (config.weights && config.weights.some((w) => w < 0)) {
          return 'Weights must be non-negative';
        }
        break;
      }
    }

    return null;
  }

  /**
   * Get default config for a generator type
   */
  static getDefaultConfig(type: GeneratorType): GeneratorConfig {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().split('T')[0];

    switch (type) {
      case 'integerSequence':
        return { type: 'integerSequence', start: 1, step: 1 };
      case 'dateSequence':
        return { type: 'dateSequence', start: today, increment: 1, unit: 'days' };
      case 'randomNumber':
        return { type: 'randomNumber', min: 0, max: 100, decimals: 0 };
      case 'randomDate':
        return { type: 'randomDate', from: today, to: nextYearStr };
      case 'randomBoolean':
        return { type: 'randomBoolean', trueProbability: 0.5 };
      case 'randomCategory':
        return { type: 'randomCategory', values: ['A', 'B', 'C'] };
      default:
        return { type: 'integerSequence', start: 1, step: 1 };
    }
  }
}
