import { ColumnSchema } from '../../core/schema-engine';
import { DataRow } from '../types';

/**
 * GeneratorService
 *
 * Handles data generation logic for creating synthetic datasets.
 * Supports sequence generators (integer, date) and random generators (number, date).
 */

export type GeneratorType =
  | 'numberSequence'
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
  | NumberSequenceConfig
  | DateSequenceConfig
  | RandomNumberConfig
  | RandomDateConfig
  | RandomBooleanConfig
  | RandomCategoryConfig;

export interface NumberSequenceConfig {
  type: 'numberSequence';
  start: number | string;
  step: number | string;
  stop?: number | string;
  decimals: number;
}

export interface DateSequenceConfig {
  type: 'dateSequence';
  start: string; // ISO date string or YYYY-MM-DD HH:mm:ss
  increment: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  stop?: string; // ISO date string
}

export interface RandomNumberConfig {
  type: 'randomNumber';
  min: number | string;
  max: number | string;
  decimals: number;
}

export interface RandomDateConfig {
  type: 'randomDate';
  from: string; // ISO date string
  to: string; // ISO date string
}

export interface RandomBooleanConfig {
  type: 'randomBoolean';
  trueProbability: number | string; // 0-1
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
   * Calculate row count based on generators with stop values
   */
  static calculateRowCount(generators: ColumnGenerator[]): number | null {
    for (const gen of generators) {
      if (gen.type === 'numberSequence') {
        const config = gen.config as NumberSequenceConfig;
        const start = Number(config.start);
        const stop = config.stop !== undefined ? Number(config.stop) : undefined;
        const step = config.step !== undefined && config.step !== '' ? Number(config.step) : 1;
        if (stop !== undefined && step !== 0) {
          const count = Math.floor((stop - start) / step + 0.0000000001) + 1;
          return Math.max(0, count);
        }
      } else if (gen.type === 'dateSequence') {
        const config = gen.config as DateSequenceConfig;
        if (config.stop && config.increment !== 0) {
          const start = new Date(config.start).getTime();
          const stop = new Date(config.stop).getTime();
          if (isNaN(start) || isNaN(stop)) return null;

          let count = 0;
          let current = new Date(config.start);
          const stopDate = new Date(config.stop);

          while (
            (config.increment > 0 ? current <= stopDate : current >= stopDate) &&
            count < 100001
          ) {
            count++;
            switch (config.unit) {
              case 'seconds':
                current.setSeconds(current.getSeconds() + config.increment);
                break;
              case 'minutes':
                current.setMinutes(current.getMinutes() + config.increment);
                break;
              case 'hours':
                current.setHours(current.getHours() + config.increment);
                break;
              case 'days':
                current.setDate(current.getDate() + config.increment);
                break;
              case 'weeks':
                current.setDate(current.getDate() + config.increment * 7);
                break;
              case 'months':
                current.setMonth(current.getMonth() + config.increment);
                break;
              case 'years':
                current.setFullYear(current.getFullYear() + config.increment);
                break;
            }
          }
          return count;
        }
      }
    }
    return null;
  }

  /**
   * Get the column type for a generator config
   */
  private static getColumnType(config: GeneratorConfig): ColumnSchema['type'] {
    switch (config.type) {
      case 'numberSequence':
        const numConfig = config as NumberSequenceConfig;
        return numConfig.decimals === 0 ? 'integer' : 'float';
      case 'dateSequence':
        // If start contains T or space followed by time, it's a datetime
        const dateConfig = config as DateSequenceConfig;
        const isDateTime = dateConfig.start.includes('T') || /\s\d{2}:\d{2}/.test(dateConfig.start);
        return isDateTime ? 'datetime' : 'date';
      case 'randomDate':
        const randomDateConfig = config as RandomDateConfig;
        const isRandomDateTime =
          randomDateConfig.from.includes('T') ||
          /\s\d{2}:\d{2}/.test(randomDateConfig.from) ||
          randomDateConfig.to.includes('T') ||
          /\s\d{2}:\d{2}/.test(randomDateConfig.to);
        return isRandomDateTime ? 'datetime' : 'date';
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
      case 'numberSequence':
        return this.generateNumberSequence(config, rowIndex);
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
   * Number Sequence Generator
   */
  private static generateNumberSequence(config: NumberSequenceConfig, rowIndex: number): number {
    const start = Number(config.start);
    const step = config.step !== undefined && config.step !== '' ? Number(config.step) : 1;
    const val = start + step * rowIndex;
    if (config.decimals === 0) {
      return Math.round(val);
    }
    return parseFloat(val.toFixed(config.decimals));
  }

  /**
   * Date Sequence Generator
   */
  private static generateDateSequence(config: DateSequenceConfig, rowIndex: number): string {
    const date = new Date(config.start);

    switch (config.unit) {
      case 'seconds':
        date.setSeconds(date.getSeconds() + config.increment * rowIndex);
        break;
      case 'minutes':
        date.setMinutes(date.getMinutes() + config.increment * rowIndex);
        break;
      case 'hours':
        date.setHours(date.getHours() + config.increment * rowIndex);
        break;
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

    // Determine if we should output datetime or just date based on unit or input format
    const isDateTime =
      ['seconds', 'minutes', 'hours'].includes(config.unit || 'days') ||
      config.start.includes('T') ||
      /\s\d{2}:\d{2}/.test(config.start) ||
      (config.stop && (config.stop.includes('T') || /\s\d{2}:\d{2}/.test(config.stop)));

    if (isDateTime) {
      // Format as YYYY-MM-DD HH:mm:ss
      const pad = (n: number) => String(n).padStart(2, '0');
      return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
      );
    }

    // Return date string (YYYY-MM-DD) using local time
    const pad2 = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  /**
   * Random Number Generator
   */
  private static generateRandomNumber(config: RandomNumberConfig): number {
    const min = Number(config.min);
    const max = Number(config.max);
    const random = Math.random() * (max - min) + min;
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

    // If from/to has 'T' or space followed by time, it's a datetime
    const isDateTime =
      config.from.includes('T') ||
      /\s\d{2}:\d{2}/.test(config.from) ||
      config.to.includes('T') ||
      /\s\d{2}:\d{2}/.test(config.to);

    const pad = (n: number) => String(n).padStart(2, '0');
    if (isDateTime) {
      return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
      );
    }

    // Return date string (YYYY-MM-DD) using local time
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  /**
   * Random Boolean Generator
   */
  private static generateRandomBoolean(config: RandomBooleanConfig): boolean {
    return Math.random() < Number(config.trueProbability);
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
  static validateGenerator(gen: ColumnGenerator, rowAuto: boolean = false): string | null {
    if (!gen.name || gen.name.trim() === '') {
      return 'Column name cannot be empty';
    }

    switch (gen.config.type) {
      case 'numberSequence': {
        const config = gen.config as NumberSequenceConfig;
        const start = Number(config.start);
        const stop =
          config.stop !== undefined && config.stop !== '' ? Number(config.stop) : undefined;
        const step = config.step !== undefined && config.step !== '' ? Number(config.step) : 1;

        if (config.start === undefined || isNaN(start)) {
          return 'Start value is required';
        }
        if (
          rowAuto &&
          (config.stop === undefined || config.stop === '' || isNaN(Number(config.stop)))
        ) {
          return 'Stop value is required for auto-calculation';
        }
        if (step === 0) {
          return 'Step cannot be zero';
        }
        if (config.decimals < 0 || config.decimals > 10) {
          return 'Decimals must be between 0 and 10';
        }
        if (stop !== undefined && !isNaN(stop)) {
          if (step > 0 && start > stop) {
            return 'Start must be less than or equal to stop for positive step';
          }
          if (step < 0 && start < stop) {
            return 'Start must be greater than or equal to stop for negative step';
          }
          const count = Math.floor((stop - start) / step + 0.0000000001) + 1;
          if (count > 100000) {
            return 'Range would generate more than 100,000 rows';
          }
        }
        break;
      }
      case 'dateSequence': {
        const config = gen.config as DateSequenceConfig;
        if (!config.start || config.start.trim() === '') {
          return 'Start date is required';
        }
        if (rowAuto && (!config.stop || config.stop.trim() === '')) {
          return 'Stop date is required for auto-calculation';
        }
        if (isNaN(new Date(config.start).getTime())) {
          return 'Invalid start date';
        }
        if (config.increment === 0) {
          return 'Increment cannot be zero';
        }
        if (config.stop && config.stop.trim() !== '') {
          const startTime = new Date(config.start).getTime();
          const stopTime = new Date(config.stop).getTime();
          if (isNaN(stopTime)) {
            return 'Invalid stop date';
          }
          if (config.increment > 0 && startTime > stopTime) {
            return 'Start date must be before stop date for positive increment';
          }
          if (config.increment < 0 && startTime < stopTime) {
            return 'Start date must be after stop date for negative increment';
          }
          // Rough check for row count (we'll be more precise in calculateRowCount but this is for early validation)
          const absDiff = Math.abs(stopTime - startTime);
          let divisor = 1;
          switch (config.unit) {
            case 'seconds':
              divisor = 1000;
              break;
            case 'minutes':
              divisor = 1000 * 60;
              break;
            case 'hours':
              divisor = 1000 * 60 * 60;
              break;
            case 'days':
              divisor = 1000 * 60 * 60 * 24;
              break;
            case 'weeks':
              divisor = 1000 * 60 * 60 * 24 * 7;
              break;
            case 'months':
              divisor = 1000 * 60 * 60 * 24 * 30;
              break;
            case 'years':
              divisor = 1000 * 60 * 60 * 24 * 365;
              break;
          }

          if (absDiff / (divisor * Math.abs(config.increment)) > 100000) {
            return 'Date range would generate too many rows';
          }
        }
        break;
      }
      case 'randomNumber': {
        const config = gen.config as RandomNumberConfig;
        const min = Number(config.min);
        const max = Number(config.max);
        if (min >= max) {
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
        const prob = Number(config.trueProbability);
        if (prob < 0 || prob > 1 || isNaN(prob)) {
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
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = `${nextYear.getFullYear()}-${pad(nextYear.getMonth() + 1)}-${pad(nextYear.getDate())}`;

    switch (type) {
      case 'numberSequence':
        return { type: 'numberSequence', start: 1, step: 1, decimals: 0 };
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
        return { type: 'numberSequence', start: 1, step: 1, decimals: 0 };
    }
  }
}
