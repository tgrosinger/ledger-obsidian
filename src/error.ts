import { FileBlock, TransactionWithBlock } from './parser';

export type Error = TxError | ParseError;

export interface ParseError {
  message: string;
  error?: any;
  block: FileBlock;
}

export interface TxError {
  message: string;
  transaction: TransactionWithBlock;
}
