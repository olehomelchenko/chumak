import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { JoinType, JoinTarget } from '../../../../types/modes';

export interface KeyPairAnalysis {
  leftCol: string | null;
  rightCol: string | null;
  leftUnique: number;
  rightUnique: number;
  leftHasDuplicates: boolean;
  rightHasDuplicates: boolean;
  leftOnly: number;
  rightOnly: number;
  matches: number;
  leftTotalRows: number;
  rightTotalRows: number;
  leftNonNullRows: number;
  rightNonNullRows: number;
  leftMatchPercent: number;
  rightMatchPercent: number;
  leftOnlyPercent: number;
  rightOnlyPercent: number;
  leftOnlyValues: any[];
  rightOnlyValues: any[];
}

export interface MismatchPreview {
  values: any[];
  column: string;
  side: 'left' | 'right';
}

export const joinState = {
  leftModel: signal<string | null>(null),
  rightModel: signal<string | null>(null),
  joinType: signal<JoinType>('left'),
  keyPairs: signal<(string | null)[][]>([[null, null]]),
  suffixes: signal<string[]>(['_x', '_y']),
  targets: signal<JoinTarget[]>([]),
  leftColumns: signal<string[]>([]),
  rightColumns: signal<string[]>([]),
  selectedLeftColumns: signal<string[]>([]),
  selectedRightColumns: signal<string[]>([]),
  saveAsNewModel: signal(false),
  previewData: signal<any | null>(null),
  previewError: signal<string | null>(null),
  isPreviewing: signal(false),
  keyPairAnalysis: signal<KeyPairAnalysis[]>([]),
  previewTableId: signal<string | null>(null),
  previewMismatchValues: signal<MismatchPreview | null>(null),
};

export function resetJoinState() {
  joinState.leftModel.value = null;
  joinState.rightModel.value = null;
  joinState.joinType.value = 'left';
  joinState.keyPairs.value = [[null, null]];
  joinState.suffixes.value = ['_x', '_y'];
  joinState.targets.value = [];
  joinState.leftColumns.value = [];
  joinState.rightColumns.value = [];
  joinState.selectedLeftColumns.value = [];
  joinState.selectedRightColumns.value = [];
  joinState.saveAsNewModel.value = false;
  joinState.previewData.value = null;
  joinState.previewError.value = null;
  joinState.isPreviewing.value = false;
  joinState.keyPairAnalysis.value = [];
  joinState.previewTableId.value = null;
  joinState.previewMismatchValues.value = null;
}

registerResetFunction(resetJoinState);
